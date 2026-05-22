import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
