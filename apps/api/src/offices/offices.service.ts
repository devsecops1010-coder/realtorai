import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { RequestContext } from '../common/context/request-context';

export interface TeamMemberStats {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  leadsAssigned: number;
  hotLeads: number;
  openTasks: number;
  propertiesAsAssignee: number;
}

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfficeDto) {
    // tenantId is injected at runtime by the tenant-scope Prisma extension.
    const initialAreaStrings = await this.resolveAreaStrings(dto);
    const data: Omit<Prisma.OfficeUncheckedCreateInput, 'tenantId'> = {
      name: dto.name.trim(),
      city: dto.city?.trim() ?? null,
      areas: initialAreaStrings,
      phone: dto.phone ?? null,
      whatsappNumber: dto.whatsappNumber ?? null,
    };
    const office = await this.prisma.scoped.office.create({
      data: data as Prisma.OfficeUncheckedCreateInput,
    });
    if (dto.areaIds && dto.areaIds.length > 0) {
      await this.syncAreaLinks(office.id, dto.areaIds);
    }
    return office;
  }

  async getCurrent() {
    const officeId = RequestContext.get().officeId;
    if (!officeId) throw new ForbiddenException('User has no office assigned');
    const office = await this.prisma.scoped.office.findFirst({
      where: { id: officeId },
      include: this.officeInclude(),
    });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  async getById(id: string) {
    const office = await this.prisma.scoped.office.findFirst({
      where: { id },
      include: this.officeInclude(),
    });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  private officeInclude(): Prisma.OfficeInclude {
    return {
      areaLinks: {
        include: { area: true },
        orderBy: { area: { sortOrder: 'asc' } },
      },
    };
  }

  /**
   * Per-user stats for the current office: how many leads/hot leads each
   * realtor owns, how many open tasks are on them, etc. Used by the office
   * page to render a clickable team table. Single round-trip — all counts
   * are issued in parallel via Promise.all then re-grouped by userId.
   */
  async getTeamStats(): Promise<{ officeId: string; members: TeamMemberStats[] }> {
    const officeId = RequestContext.get().officeId;
    if (!officeId) throw new ForbiddenException('User has no office assigned');

    // Tenant scoping is enforced by the Prisma extension; we only need to
    // pin to officeId on the writes for the per-user `where` clauses.
    const users = await this.prisma.scoped.user.findMany({
      where: { officeId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    const [leadGroups, hotLeadGroups, taskGroups, propertyGroups] = await Promise.all([
      this.prisma.scoped.lead.groupBy({
        by: ['assignedUserId'],
        where: { officeId, assignedUserId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.scoped.lead.groupBy({
        by: ['assignedUserId'],
        where: { officeId, assignedUserId: { not: null }, status: LeadStatus.hot },
        _count: { _all: true },
      }),
      this.prisma.scoped.task.groupBy({
        by: ['assignedUserId'],
        where: { officeId, assignedUserId: { not: null }, status: TaskStatus.open },
        _count: { _all: true },
      }),
      // Properties don't have a direct assignee — use the ownerLead's assignedUserId
      // as a proxy ("who handles the owner relationship for this listing").
      this.prisma.scoped.property.findMany({
        where: { officeId, ownerLead: { isNot: null } },
        select: { ownerLead: { select: { assignedUserId: true } } },
      }),
    ]);

    const byUser = <T extends { assignedUserId: string | null; _count: { _all: number } }>(
      groups: T[],
    ): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const g of groups) if (g.assignedUserId) out[g.assignedUserId] = g._count._all;
      return out;
    };

    const leadCounts = byUser(leadGroups);
    const hotCounts = byUser(hotLeadGroups);
    const taskCounts = byUser(taskGroups);
    const propertyCounts: Record<string, number> = {};
    for (const p of propertyGroups) {
      const uid = p.ownerLead?.assignedUserId;
      if (uid) propertyCounts[uid] = (propertyCounts[uid] ?? 0) + 1;
    }

    const members: TeamMemberStats[] = users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      leadsAssigned: leadCounts[u.id] ?? 0,
      hotLeads: hotCounts[u.id] ?? 0,
      openTasks: taskCounts[u.id] ?? 0,
      propertiesAsAssignee: propertyCounts[u.id] ?? 0,
    }));

    // Sort by leads desc so the most active sellers float to the top.
    members.sort((a, b) => b.leadsAssigned - a.leadsAssigned);
    return { officeId, members };
  }

  async updateCurrent(dto: UpdateOfficeDto) {
    const officeId = RequestContext.get().officeId;
    if (!officeId) throw new ForbiddenException('User has no office assigned');

    // If the client sent areaIds, that's the source of truth — we resolve the
    // catalog rows, sync the junction, and denormalize their nameHe values
    // back into the legacy `areas` string column. If the client sent only the
    // legacy `areas`, we keep accepting it as-is.
    let denormalizedAreas: string[] | undefined;
    if (dto.areaIds !== undefined) {
      denormalizedAreas = await this.resolveAreaStringsFromIds(dto.areaIds);
    } else if (dto.areas !== undefined) {
      denormalizedAreas = dto.areas;
    }

    const office = await this.prisma.scoped.office.update({
      where: { id: officeId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.city !== undefined && { city: dto.city.trim() }),
        ...(denormalizedAreas !== undefined && { areas: denormalizedAreas }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.whatsappNumber !== undefined && { whatsappNumber: dto.whatsappNumber }),
      },
    });
    if (dto.areaIds !== undefined) {
      await this.syncAreaLinks(office.id, dto.areaIds);
    }
    return this.getCurrent();
  }

  // -------------------------------------------------------------------------
  // Catalog/junction helpers
  //
  // The strategy: catalog-backed `areaIds` is the new source of truth. We
  // sync the OfficeArea junction *and* denormalize the matching `nameHe`
  // values back into the legacy `Office.areas` String[] column so old code
  // (and the WhatsApp routing logic, which still uses free text) keeps
  // working without a coordinated cutover.
  // -------------------------------------------------------------------------

  /**
   * Returns the array of catalog `nameHe` values for the given area IDs.
   * Throws if any ID doesn't resolve — catches client typos early instead of
   * silently dropping the row.
   */
  private async resolveAreaStringsFromIds(areaIds: string[]): Promise<string[]> {
    if (areaIds.length === 0) return [];
    const rows = await this.prisma.unscoped().areaCatalog.findMany({
      where: { id: { in: areaIds } },
      select: { id: true, nameHe: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length !== areaIds.length) {
      const found = new Set(rows.map((r) => r.id));
      const missing = areaIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Unknown areaIds: ${missing.join(', ')}. Use /catalog/areas to discover valid IDs.`,
      );
    }
    return rows.map((r) => r.nameHe);
  }

  /**
   * Picks the right input to denormalize: `areaIds` wins if present, else
   * legacy `areas`. Used by `create()` which has both options on the same DTO.
   */
  private async resolveAreaStrings(dto: { areas?: string[]; areaIds?: string[] }): Promise<string[]> {
    if (dto.areaIds && dto.areaIds.length > 0) {
      return this.resolveAreaStringsFromIds(dto.areaIds);
    }
    return dto.areas ?? [];
  }

  /**
   * Reconciles the OfficeArea junction table for a given office. We delete
   * any existing links not in the new set and insert any new ones. Runs
   * inside a transaction so a partial failure doesn't leave the office in a
   * half-synced state.
   */
  private async syncAreaLinks(officeId: string, areaIds: string[]): Promise<void> {
    const unique = Array.from(new Set(areaIds));
    await this.prisma.unscoped().$transaction(async (tx) => {
      await tx.officeArea.deleteMany({
        where: { officeId, areaId: { notIn: unique.length > 0 ? unique : ['__none__'] } },
      });
      if (unique.length === 0) return;
      // createMany skipDuplicates lets us re-sync without first deleting
      // everything (cheap idempotent re-write).
      await tx.officeArea.createMany({
        data: unique.map((areaId) => ({ officeId, areaId })),
        skipDuplicates: true,
      });
    });
  }
}
