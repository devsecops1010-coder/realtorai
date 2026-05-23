import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Called only from platform_admin endpoints.
  list() {
    return this.prisma.unscoped().tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { offices: true, users: true } } },
    });
  }

  /**
   * Returns the tenant header + per-month usage + lead/property/user counts
   * so the platform team can drill into a tenant from the /admin overview.
   * Unscoped — deliberate cross-tenant read, guarded by @Roles(platform_admin)
   * on the controller.
   */
  async getById(id: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const tenant = await this.prisma.unscoped().tenant.findUnique({
      where: { id },
      select: {
        id: true, name: true, status: true, plan: true, planCatalogId: true,
        monthlyPlanIls: true, setupFeeIls: true, includedMessages: true,
        includedCallMinutes: true, monthlyLlmBudgetUsd: true,
        billingNotes: true, createdAt: true,
        suspendedAt: true, suspendedReason: true, suspendedByUserId: true,
        planCatalog: {
          select: { id: true, slug: true, nameHe: true, nameEn: true, tagline: true },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Pull in samples of each entity so the admin drilldown can render
    // actual rows below the counts — saves the user from clicking out to
    // another page just to peek at recent activity.
    const [
      offices,
      usersList,
      leadsCount,
      leadsList,
      propertiesCount,
      propertiesList,
      messages24h,
      handoffs,
      usageRaw,
      recentConvos,
    ] = await Promise.all([
      this.prisma.unscoped().office.findMany({
        where: { tenantId: id },
        select: { id: true, name: true, city: true, whatsappNumber: true, status: true },
      }),
      this.prisma.unscoped().user.findMany({
        where: { tenantId: id },
        select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.unscoped().lead.count({ where: { tenantId: id } }),
      this.prisma.unscoped().lead.findMany({
        where: { tenantId: id },
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          temperature: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.unscoped().property.count({ where: { tenantId: id } }),
      this.prisma.unscoped().property.findMany({
        where: { tenantId: id },
        select: {
          id: true,
          dealType: true,
          city: true,
          area: true,
          rooms: true,
          price: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.unscoped().message.count({
        where: { tenantId: id, createdAt: { gte: since } },
      }),
      this.prisma.unscoped().conversation.count({
        where: { tenantId: id, status: 'handoff' },
      }),
      this.prisma.unscoped().usageEvent.groupBy({
        by: ['type'],
        where: { tenantId: id, createdAt: { gte: monthStart } },
        _sum: { quantity: true, costEstimate: true },
      }),
      this.prisma.unscoped().conversation.findMany({
        where: { tenantId: id, startedAt: { gte: since } },
        select: {
          id: true,
          channel: true,
          status: true,
          handoffRequired: true,
          startedAt: true,
          lead: { select: { fullName: true, phone: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ]);

    const usage: Record<string, { quantity: number; costEstimate: string }> = {};
    for (const r of usageRaw) {
      usage[r.type] = {
        quantity: r._sum.quantity ?? 0,
        costEstimate: r._sum.costEstimate?.toString() ?? '0',
      };
    }

    return {
      tenant: {
        ...tenant,
        monthlyLlmBudgetUsd: tenant.monthlyLlmBudgetUsd?.toString() ?? '0',
      },
      offices,
      users: usersList,
      recentLeads: leadsList.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      recentProperties: propertiesList.map((p) => ({
        ...p,
        price: p.price?.toString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      recentConversations: recentConvos.map((c) => ({
        ...c,
        startedAt: c.startedAt.toISOString(),
      })),
      counts: {
        users: usersList.length,
        leads: leadsCount,
        properties: propertiesCount,
        messagesLast24h: messages24h,
        openHandoffs: handoffs,
      },
      usageThisMonth: usage,
    };
  }

  create(dto: CreateTenantDto) {
    return this.prisma.unscoped().tenant.create({
      data: {
        name: dto.name.trim(),
        status: dto.status ?? TenantStatus.trial,
        plan: dto.plan ?? 'starter',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Suspension lifecycle
  //
  // Suspend = set status=suspended + record who/why/when + revoke every
  // refresh token so existing sessions can't refresh past their 15-minute
  // access token TTL. Reactivate = inverse: clear suspension metadata.
  //
  // Both operations also queue an email to every owner of the tenant. Emails
  // are best-effort (failures don't roll back the DB change) so the admin
  // doesn't get stuck if the email provider is down.
  // ---------------------------------------------------------------------------

  async suspend(args: {
    tenantId: string;
    reason: string;
    actorUserId: string;
    notifyOwner?: boolean;
  }) {
    const tenant = await this.prisma.unscoped().tenant.findUnique({
      where: { id: args.tenantId },
      select: { id: true, name: true, status: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.status === 'suspended') {
      throw new BadRequestException('Tenant already suspended');
    }

    const updated = await this.prisma.unscoped().$transaction(async (tx) => {
      const row = await tx.tenant.update({
        where: { id: args.tenantId },
        data: {
          status: TenantStatus.suspended,
          suspendedAt: new Date(),
          suspendedReason: args.reason.trim(),
          suspendedByUserId: args.actorUserId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          suspendedAt: true,
          suspendedReason: true,
          suspendedByUserId: true,
        },
      });
      // Force every user of the tenant to re-login. Their access tokens
      // remain valid for up to 15 minutes but the TenantStatusGuard will
      // reject every request — and refresh will fail since the row is
      // revoked. Net effect: full logout within one access-token TTL.
      await tx.refreshToken.updateMany({
        where: {
          user: { tenantId: args.tenantId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return row;
    });

    if (args.notifyOwner !== false) {
      void this.notifyOwners(args.tenantId, 'suspended', args.reason);
    }

    return updated;
  }

  async reactivate(args: {
    tenantId: string;
    note?: string;
    actorUserId: string;
    notifyOwner?: boolean;
  }) {
    const tenant = await this.prisma.unscoped().tenant.findUnique({
      where: { id: args.tenantId },
      select: { id: true, name: true, status: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.status !== 'suspended') {
      throw new BadRequestException('Tenant is not suspended');
    }

    const updated = await this.prisma.unscoped().tenant.update({
      where: { id: args.tenantId },
      data: {
        status: TenantStatus.active,
        suspendedAt: null,
        suspendedReason: null,
        suspendedByUserId: null,
      },
      select: { id: true, name: true, status: true },
    });

    if (args.notifyOwner !== false) {
      void this.notifyOwners(args.tenantId, 'reactivated', args.note ?? null);
    }

    return updated;
  }

  /**
   * Switches the tenant to a different PlanCatalog row. Copies the catalog
   * defaults into the per-tenant billing fields so subsequent edits to the
   * catalog don't retroactively change the live tenant.
   */
  async setPlan(args: { tenantId: string; planSlug: string; actorUserId: string }) {
    const plan = await this.prisma.unscoped().planCatalog.findUnique({
      where: { slug: args.planSlug },
    });
    if (!plan) throw new NotFoundException(`Plan '${args.planSlug}' not in catalog`);

    return this.prisma.unscoped().tenant.update({
      where: { id: args.tenantId },
      data: {
        plan: plan.slug,
        planCatalogId: plan.id,
        // Apply catalog defaults — admin can edit these per-tenant later
        // via the existing tenant detail page.
        setupFeeIls: plan.setupFeeIls,
        monthlyPlanIls: plan.monthlyPlanIls,
        includedMessages: plan.includedMessages,
        includedCallMinutes: plan.includedCallMinutes,
        monthlyLlmBudgetUsd: plan.monthlyLlmBudgetUsd as unknown as Prisma.Decimal,
      },
      select: { id: true, plan: true, planCatalogId: true, monthlyPlanIls: true },
    });
  }

  private async notifyOwners(
    tenantId: string,
    kind: 'suspended' | 'reactivated',
    detail: string | null,
  ) {
    try {
      const tenant = await this.prisma.unscoped().tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true },
      });
      if (!tenant) return;
      const owners = await this.prisma.unscoped().user.findMany({
        where: {
          tenantId,
          role: { in: ['office_owner', 'office_manager', 'ceo', 'deputy_ceo'] },
          status: 'active',
        },
        select: { name: true, email: true },
      });
      for (const owner of owners) {
        if (kind === 'suspended') {
          await this.email.sendTenantSuspended({
            to: owner.email,
            recipientName: owner.name,
            tenantName: tenant.name,
            reason: detail,
          });
        } else {
          await this.email.sendTenantReactivated({
            to: owner.email,
            recipientName: owner.name,
            tenantName: tenant.name,
            note: detail,
          });
        }
      }
    } catch (err) {
      // Email failures are best-effort — the suspension itself already
      // committed. Log and move on so the admin UI doesn't show a fake error.
      this.logger.warn(`notifyOwners(${kind}) failed for tenant ${tenantId}: ${(err as Error).message}`);
    }
  }
}
