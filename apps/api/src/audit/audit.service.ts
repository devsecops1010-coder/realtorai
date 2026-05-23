import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ListAuditQuery {
  tenantId?: string;     // platform_admin filter; tenant-scope users see only their tenant
  actorType?: string;    // user | ai_agent | system
  actorId?: string;
  action?: string;       // substring match
  targetType?: string;
  targetId?: string;
  from?: string;         // ISO date
  to?: string;
  take?: number;
  skip?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List audit entries. When called from a tenant-scope user, the Prisma
   * extension auto-filters by their tenantId. Platform_admin endpoints use
   * unscoped explicitly via listAcrossTenants().
   */
  async list(query: ListAuditQuery) {
    const where = this.buildWhere(query);
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const skip = Math.max(query.skip ?? 0, 0);

    const [items, total, actions] = await Promise.all([
      this.prisma.scoped.auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scoped.auditLog.count({ where }),
      // Top 20 distinct action values from the past 30 days — populates
      // the filter dropdown in the UI without an extra round-trip.
      this.distinctActions(),
    ]);

    return { items, total, take, skip, actions };
  }

  async listAcrossTenants(query: ListAuditQuery) {
    const where = this.buildWhere(query);
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const skip = Math.max(query.skip ?? 0, 0);

    const [items, total, actions] = await Promise.all([
      this.prisma.unscoped().auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.unscoped().auditLog.count({ where }),
      this.distinctActions(true),
    ]);

    return { items, total, take, skip, actions };
  }

  private buildWhere(query: ListAuditQuery): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.actorType) where.actorType = query.actorType;
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    return where;
  }

  private async distinctActions(unscoped = false): Promise<string[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const client = unscoped ? this.prisma.unscoped() : this.prisma.scoped;
    const groups = await client.auditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    });
    return groups.map((g) => g.action);
  }
}
