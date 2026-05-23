import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentStatus,
  AgentType,
  Prisma,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env.schema';
import { SetupOfficeDto } from './dto/setup-office.dto';

const DEFAULT_LEAD_PROMPT_TEMPLATE = `You are a warm, professional inbound-lead responder for the office "{office}".
Reply in Hebrew unless the customer writes in English.
Be brief, ask one focused question per turn, and hand off to a human when the lead shows real intent + budget + area + timeline.`;

const DEFAULT_RECRUITER_PROMPT_TEMPLATE = `You are a respectful property-recruiter for the office "{office}".
Talk to property owners about possible sale or rental. Never promise a price or buyer.
Hand off to a human when the owner is genuinely interested.`;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async setupOffice(dto: SetupOfficeDto) {
    const emailLc = dto.ownerEmail.toLowerCase().trim();
    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    const passwordHash = await bcrypt.hash(dto.ownerPassword, rounds);

    // Resolve catalog-backed plan + areas BEFORE opening the transaction so
    // a bad slug fails fast (404) instead of mid-write.
    const planSlugInput = dto.planSlug?.trim() || dto.plan?.trim() || null;
    const planRow = planSlugInput
      ? await this.prisma.unscoped().planCatalog.findUnique({ where: { slug: planSlugInput } })
      : null;
    if (dto.planSlug && !planRow) {
      throw new ConflictException(`Plan slug '${dto.planSlug}' not in catalog`);
    }

    let areaRows: { id: string; nameHe: string; sortOrder: number }[] = [];
    if (dto.areaIds && dto.areaIds.length > 0) {
      areaRows = await this.prisma.unscoped().areaCatalog.findMany({
        where: { id: { in: dto.areaIds } },
        select: { id: true, nameHe: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (areaRows.length !== dto.areaIds.length) {
        const found = new Set(areaRows.map((r) => r.id));
        const missing = dto.areaIds.filter((id) => !found.has(id));
        throw new ConflictException(`Unknown areaIds: ${missing.join(', ')}`);
      }
    }
    const denormalizedAreas =
      areaRows.length > 0
        ? areaRows.map((r) => r.nameHe)
        : (dto.areas?.map((area) => area.trim()).filter(Boolean) ?? []);

    try {
      return await this.prisma.unscoped().$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.tenantName.trim(),
            status: dto.tenantStatus ?? TenantStatus.trial,
            // Keep the legacy `plan` string in sync with the catalog slug so
            // every read path keeps working until we drop the column.
            plan: planRow?.slug ?? planSlugInput ?? 'starter',
            planCatalogId: planRow?.id ?? null,
            // Plan defaults are overridable by explicit DTO fields (so admin
            // can tweak per-tenant pricing) but fall through to the catalog
            // when not given. The legacy explicit-only path is preserved.
            setupFeeIls: dto.setupFeeIls ?? planRow?.setupFeeIls ?? 0,
            monthlyPlanIls: dto.monthlyPlanIls ?? planRow?.monthlyPlanIls ?? 0,
            includedMessages: dto.includedMessages ?? planRow?.includedMessages ?? 0,
            includedCallMinutes:
              dto.includedCallMinutes ?? planRow?.includedCallMinutes ?? 0,
            monthlyLlmBudgetUsd:
              dto.monthlyLlmBudgetUsd ??
              (planRow ? (planRow.monthlyLlmBudgetUsd as unknown as Prisma.Decimal) : 0),
            billingNotes: dto.billingNotes?.trim() || null,
          },
        });

        const office = await tx.office.create({
          data: {
            tenantId: tenant.id,
            name: dto.officeName.trim(),
            city: dto.city?.trim() || null,
            areas: denormalizedAreas,
            phone: dto.phone?.trim() || null,
            whatsappNumber: dto.whatsappNumber?.trim() || null,
          },
        });

        if (areaRows.length > 0) {
          await tx.officeArea.createMany({
            data: areaRows.map((r) => ({ officeId: office.id, areaId: r.id })),
            skipDuplicates: true,
          });
        }

        const owner = await tx.user.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            name: dto.ownerName.trim(),
            email: emailLc,
            phone: dto.ownerPhone?.trim() || null,
            role: UserRole.office_owner,
            status: UserStatus.active,
            passwordHash,
          },
        });

        const leadAgent = await tx.agent.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            type: AgentType.lead_responder,
            name: 'Lead Responder',
            status: AgentStatus.active,
          },
        });
        await tx.agentConfig.create({
          data: {
            tenantId: tenant.id,
            agentId: leadAgent.id,
            prompt:
              dto.leadResponderTone ??
              DEFAULT_LEAD_PROMPT_TEMPLATE.replace('{office}', office.name),
            version: 1,
            isActive: true,
            rules: {
              workingHours: dto.workingHours ?? '08:00-20:00',
            } as Prisma.InputJsonValue,
          },
        });

        const recruiterAgent = await tx.agent.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            type: AgentType.property_recruiter,
            name: 'Property Recruiter',
            status: AgentStatus.active,
          },
        });
        await tx.agentConfig.create({
          data: {
            tenantId: tenant.id,
            agentId: recruiterAgent.id,
            prompt:
              dto.propertyRecruiterTone ??
              DEFAULT_RECRUITER_PROMPT_TEMPLATE.replace('{office}', office.name),
            version: 1,
            isActive: true,
            rules: {
              workingHours: dto.workingHours ?? '08:00-20:00',
            } as Prisma.InputJsonValue,
          },
        });

        return {
          tenant,
          office,
          owner: {
            id: owner.id,
            tenantId: owner.tenantId,
            officeId: owner.officeId,
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
            role: owner.role,
            status: owner.status,
          },
          agents: [leadAgent, recruiterAgent],
          nextSteps: [
            'לחבר WhatsApp/טלפוניה',
            'להעלות לידים ונכסים ראשונים',
            'להגדיר שעות פעילות ותסריטי שיחה',
          ],
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Owner email already exists in this tenant');
      }
      throw error;
    }
  }

  async usageByTenant() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const raw = await this.prisma.unscoped().usageEvent.groupBy({
      by: ['tenantId', 'type'],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { quantity: true, costEstimate: true },
    });
    const tenants = await this.prisma.unscoped().tenant.findMany({
      select: { id: true, name: true, status: true, plan: true, monthlyPlanIls: true },
    });
    const byTenant = new Map<string, any>();
    for (const t of tenants) {
      byTenant.set(t.id, {
        tenantId: t.id,
        name: t.name,
        status: t.status,
        plan: t.plan,
        monthlyPlanIls: t.monthlyPlanIls,
        byType: {} as Record<string, { quantity: number; costEstimate: string }>,
      });
    }
    for (const r of raw) {
      const item = byTenant.get(r.tenantId);
      if (!item) continue;
      item.byType[r.type] = {
        quantity: r._sum.quantity ?? 0,
        costEstimate: r._sum.costEstimate?.toString() ?? '0',
      };
    }
    return Array.from(byTenant.values());
  }

  async platformHealth() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [tenants, activeTenants, leadsToday, messagesToday, handoffOpen] = await Promise.all([
      this.prisma.unscoped().tenant.count(),
      this.prisma.unscoped().tenant.count({ where: { status: 'active' } }),
      this.prisma.unscoped().lead.count({ where: { createdAt: { gte: since } } }),
      this.prisma.unscoped().message.count({ where: { createdAt: { gte: since } } }),
      this.prisma.unscoped().conversation.count({ where: { status: 'handoff' } }),
    ]);
    return {
      tenants,
      activeTenants,
      leadsLast24h: leadsToday,
      messagesLast24h: messagesToday,
      openHandoffs: handoffOpen,
    };
  }

  /**
   * Per-office drilldown for the admin. Returns the office header + the
   * tenant it belongs to + counts of users/leads/properties scoped to this
   * office, plus recent samples. Unscoped — guarded by @Roles(platform_admin)
   * on the controller.
   */
  async officeDetail(officeId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const office = await this.prisma.unscoped().office.findUnique({
      where: { id: officeId },
      select: {
        id: true,
        name: true,
        city: true,
        areas: true,
        phone: true,
        whatsappNumber: true,
        status: true,
        inactivatedAt: true,
        inactivatedReason: true,
        inactivatedByUserId: true,
        createdAt: true,
        tenant: { select: { id: true, name: true, plan: true, status: true } },
        areaLinks: {
          include: { area: { select: { id: true, slug: true, nameHe: true, region: true } } },
        },
      },
    });
    if (!office) return null;

    const [
      usersList,
      leadsCount,
      leadsList,
      propertiesCount,
      propertiesList,
      messages24h,
      handoffs,
      recentConvos,
      usageRaw,
    ] = await Promise.all([
      this.prisma.unscoped().user.findMany({
        where: { officeId },
        select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.unscoped().lead.count({ where: { officeId } }),
      this.prisma.unscoped().lead.findMany({
        where: { officeId },
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
      this.prisma.unscoped().property.count({ where: { officeId } }),
      this.prisma.unscoped().property.findMany({
        where: { officeId },
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
        where: { conversation: { officeId }, createdAt: { gte: since } },
      }),
      this.prisma.unscoped().conversation.count({
        where: { officeId, status: 'handoff' },
      }),
      this.prisma.unscoped().conversation.findMany({
        where: { officeId, startedAt: { gte: since } },
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
      this.prisma.unscoped().usageEvent.groupBy({
        by: ['type'],
        where: { officeId, createdAt: { gte: monthStart } },
        _sum: { quantity: true, costEstimate: true },
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
      office: {
        ...office,
        createdAt: office.createdAt.toISOString(),
      },
      users: usersList.map((u) => ({
        ...u,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      recentLeads: leadsList.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
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

  // ---------------------------------------------------------------------------
  // Office activation lifecycle — mirrors the tenant suspension lifecycle but
  // scoped to a single branch. Useful for multi-office tenants who want to
  // pause one location without taking down the whole org.
  // ---------------------------------------------------------------------------

  async deactivateOffice(args: { officeId: string; reason: string; actorUserId: string }) {
    const office = await this.prisma.unscoped().office.findUnique({
      where: { id: args.officeId },
      select: { id: true, status: true, tenantId: true },
    });
    if (!office) throw new NotFoundException('Office not found');
    if (office.status === 'inactive') throw new ConflictException('Office already inactive');

    return this.prisma.unscoped().$transaction(async (tx) => {
      const updated = await tx.office.update({
        where: { id: args.officeId },
        data: {
          status: 'inactive',
          inactivatedAt: new Date(),
          inactivatedReason: args.reason.trim(),
          inactivatedByUserId: args.actorUserId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          inactivatedAt: true,
          inactivatedReason: true,
          inactivatedByUserId: true,
        },
      });
      // Force users of THIS office to re-login. Multi-office tenants get
      // surgical scope: only refresh tokens for users with this officeId.
      await tx.refreshToken.updateMany({
        where: { user: { officeId: args.officeId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });
  }

  async reactivateOffice(args: { officeId: string; actorUserId: string }) {
    const office = await this.prisma.unscoped().office.findUnique({
      where: { id: args.officeId },
      select: { id: true, status: true },
    });
    if (!office) throw new NotFoundException('Office not found');
    if (office.status !== 'inactive') throw new ConflictException('Office is not inactive');

    return this.prisma.unscoped().office.update({
      where: { id: args.officeId },
      data: {
        status: 'active',
        inactivatedAt: null,
        inactivatedReason: null,
        inactivatedByUserId: null,
      },
      select: { id: true, name: true, status: true },
    });
  }

  async revenueSummary() {
    const tenants = await this.prisma.unscoped().tenant.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        monthlyPlanIls: true,
        setupFeeIls: true,
      },
    });
    const mrr = tenants
      .filter((t) => t.status === 'active')
      .reduce((s, t) => s + (t.monthlyPlanIls ?? 0), 0);
    return {
      mrr,
      tenantCount: tenants.length,
      activeTenantCount: tenants.filter((t) => t.status === 'active').length,
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        monthlyPlanIls: t.monthlyPlanIls,
        setupFeeIls: t.setupFeeIls,
      })),
    };
  }
}
