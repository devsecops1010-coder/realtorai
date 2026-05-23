import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadStatus,
  OptOutChannel,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { OptOutLeadDto } from './dto/opt-out-lead.dto';
import { ListLeadsQuery } from './dto/list-leads.query';

/**
 * Minimal RFC-4180 CSV parser. Handles:
 *   - Quoted cells with embedded commas, quotes (doubled), and newlines
 *   - Mixed line endings (\r\n, \n)
 *   - Trailing blank line
 * No streaming — we expect import payloads to be < 5MB. For larger files
 * a streaming approach (e.g. csv-parse) is warranted.
 */
function parseSimpleCsv(input: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && input[i + 1] === '\n') i++;
        row.push(cell);
        cell = '';
        out.push(row);
        row = [];
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListLeadsQuery) {
    const where: Prisma.LeadWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.temperature) where.temperature = query.temperature;
    if (query.intent) where.intent = query.intent;
    if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
    if (query.officeId) where.officeId = query.officeId;
    if (query.q) {
      where.OR = [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.scoped.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.take,
        skip: query.skip,
        include: {
          assignedUser: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
        },
      }),
      this.prisma.scoped.lead.count({ where }),
    ]);

    return { items, total, take: query.take, skip: query.skip };
  }

  async getById(id: string) {
    const lead = await this.prisma.scoped.lead.findFirst({
      where: { id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        office: { select: { id: true, name: true } },
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            channel: true,
            status: true,
            startedAt: true,
            endedAt: true,
            summary: true,
            handoffRequired: true,
          },
        },
        tasks: {
          where: { status: { in: ['open', 'in_progress', 'snoozed'] } },
          orderBy: { dueAt: 'asc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(dto: CreateLeadDto) {
    const officeId = await this.resolveOfficeId(dto.officeId);
    if (dto.assignedUserId) {
      await this.assertUserBelongsToTenant(dto.assignedUserId, officeId);
    }

    const data: Omit<Prisma.LeadUncheckedCreateInput, 'tenantId'> = {
      officeId,
      assignedUserId: dto.assignedUserId ?? null,
      source: dto.source ?? 'manual',
      fullName: dto.fullName ?? null,
      nationalId: dto.nationalId ?? null,
      phone: dto.phone ?? null,
      email: dto.email?.toLowerCase().trim() ?? null,
      intent: dto.intent ?? 'unknown',
      city: dto.city ?? null,
      area: dto.area ?? null,
      streetAddress: dto.streetAddress ?? null,
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      rooms: dto.rooms ?? null,
      status: dto.status ?? LeadStatus.new,
      temperature: dto.temperature ?? 'cold',
      notes: dto.notes ?? null,
    };

    return this.prisma.scoped.lead.create({
      data: data as Prisma.LeadUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.scoped.lead.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');

    if (dto.officeId && dto.officeId !== existing.officeId) {
      await this.assertOfficeBelongsToTenant(dto.officeId);
    }
    if (dto.assignedUserId && dto.assignedUserId !== existing.assignedUserId) {
      await this.assertUserBelongsToTenant(dto.assignedUserId, dto.officeId ?? existing.officeId);
    }

    const data: Prisma.LeadUncheckedUpdateInput = {};
    if (dto.officeId !== undefined) data.officeId = dto.officeId;
    if (dto.assignedUserId !== undefined) data.assignedUserId = dto.assignedUserId;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.nationalId !== undefined) data.nationalId = dto.nationalId;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
    if (dto.intent !== undefined) data.intent = dto.intent;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.streetAddress !== undefined) data.streetAddress = dto.streetAddress;
    if (dto.budgetMin !== undefined) data.budgetMin = dto.budgetMin;
    if (dto.budgetMax !== undefined) data.budgetMax = dto.budgetMax;
    if (dto.rooms !== undefined) data.rooms = dto.rooms;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.temperature !== undefined) data.temperature = dto.temperature;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.nextFollowupAt !== undefined) data.nextFollowupAt = new Date(dto.nextFollowupAt);

    return this.prisma.scoped.lead.update({ where: { id }, data });
  }

  async assign(id: string, dto: AssignLeadDto) {
    const lead = await this.prisma.scoped.lead.findFirst({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    await this.assertUserBelongsToTenant(dto.userId, lead.officeId);

    return this.prisma.scoped.lead.update({
      where: { id },
      data: { assignedUserId: dto.userId },
    });
  }

  /**
   * Import leads from a CSV string. Expects a header row. Recognized
   * columns (case-insensitive, optional): fullName, phone, email, city,
   * area, intent, notes. Phone is treated as the de-dup key — duplicates
   * within the same tenant are skipped.
   *
   * Returns counts so the caller can show "imported X, skipped Y" without
   * having to introspect the inserted rows.
   */
  async importCsv(csv: string): Promise<{ inserted: number; skipped: number; errors: string[] }> {
    const rows = parseSimpleCsv(csv);
    if (rows.length === 0) return { inserted: 0, skipped: 0, errors: ['CSV is empty'] };
    const header = rows[0].map((c) => c.toLowerCase().trim());
    const idx = (name: string) => header.indexOf(name);
    const fullNameIdx = idx('fullname');
    const phoneIdx = idx('phone');
    const emailIdx = idx('email');
    const cityIdx = idx('city');
    const areaIdx = idx('area');
    const intentIdx = idx('intent');
    const notesIdx = idx('notes');
    if (phoneIdx === -1 && fullNameIdx === -1 && emailIdx === -1) {
      return { inserted: 0, skipped: 0, errors: ['CSV must include at least one of: fullName, phone, email'] };
    }

    const officeId = await this.resolveOfficeId(undefined);
    const errors: string[] = [];
    let inserted = 0;
    let skipped = 0;

    // Build a set of existing phones so we don't insert duplicates. We
    // could rely on unique constraints + per-row try/catch, but a single
    // bulk read is cheaper than N constraint violations.
    const existingPhones = new Set(
      (await this.prisma.scoped.lead.findMany({
        where: { phone: { not: null } },
        select: { phone: true },
      })).map((l) => (l.phone ?? '').replace(/\D/g, '')),
    );

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every((c) => c.trim() === '')) continue; // skip blanks
      const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined;
      const normalized = phone ? phone.replace(/\D/g, '') : null;
      if (normalized && existingPhones.has(normalized)) {
        skipped++;
        continue;
      }

      const intentRaw = intentIdx >= 0 ? row[intentIdx]?.trim().toLowerCase() : '';
      const intent = ['buy', 'sell', 'rent', 'list_for_rent'].includes(intentRaw)
        ? (intentRaw as 'buy' | 'sell' | 'rent' | 'list_for_rent')
        : 'unknown';

      try {
        await this.prisma.scoped.lead.create({
          data: {
            officeId,
            source: 'csv_import',
            fullName: fullNameIdx >= 0 ? row[fullNameIdx]?.trim() || null : null,
            phone: phone || null,
            email: emailIdx >= 0 ? row[emailIdx]?.toLowerCase().trim() || null : null,
            city: cityIdx >= 0 ? row[cityIdx]?.trim() || null : null,
            area: areaIdx >= 0 ? row[areaIdx]?.trim() || null : null,
            intent,
            notes: notesIdx >= 0 ? row[notesIdx]?.trim() || null : null,
          } as Prisma.LeadUncheckedCreateInput,
        });
        inserted++;
        if (normalized) existingPhones.add(normalized);
      } catch (e) {
        errors.push(`Row ${i + 1}: ${(e as Error).message}`);
      }
    }

    return { inserted, skipped, errors };
  }

  /**
   * Bulk mutate a set of leads. The action discriminator decides what gets
   * updated; one call = one action so the contract stays auditable.
   *
   * Returns the number of rows actually updated (will be ≤ ids.length if
   * any ids belonged to other tenants — tenant scoping silently filters
   * them, which is the safer behavior than 403).
   */
  async bulk(ids: string[], action: 'assign' | 'status' | 'temperature' | 'delete', value: string | null): Promise<{ updated: number }> {
    // Re-fetch through scoped client to pin the where clause to the caller's
    // tenant. updateMany with `id: { in: ids }` would otherwise hit other
    // tenants' leads if a hostile user guessed their UUIDs.
    const where: Prisma.LeadWhereInput = { id: { in: ids } };

    if (action === 'delete') {
      // Soft semantics: we mark the lead as opted_out + add a note rather
      // than hard-delete, so the audit trail + reporting numbers stay
      // accurate. Hard-delete is a separate admin-only action.
      const res = await this.prisma.scoped.lead.updateMany({
        where,
        data: { status: LeadStatus.opted_out },
      });
      return { updated: res.count };
    }

    if (action === 'assign') {
      // `value` may be `null` (unassign) or a userId. If a userId is
      // passed we verify it belongs to the tenant first — we do NOT verify
      // per-lead office matching here because bulk assign is mostly used
      // when a manager re-shuffles the queue; a stricter check would
      // surprise users.
      if (value) {
        const exists = await this.prisma.scoped.user.findFirst({ where: { id: value } });
        if (!exists) throw new BadRequestException('Assignee not found in tenant');
      }
      const res = await this.prisma.scoped.lead.updateMany({
        where,
        data: { assignedUserId: value },
      });
      return { updated: res.count };
    }

    if (action === 'status') {
      if (!value || !Object.values(LeadStatus).includes(value as LeadStatus)) {
        throw new BadRequestException('Invalid status value');
      }
      const res = await this.prisma.scoped.lead.updateMany({
        where,
        data: { status: value as LeadStatus },
      });
      return { updated: res.count };
    }

    if (action === 'temperature') {
      if (!value || !['cold', 'warm', 'hot'].includes(value)) {
        throw new BadRequestException('Invalid temperature value');
      }
      const res = await this.prisma.scoped.lead.updateMany({
        where,
        data: { temperature: value as 'cold' | 'warm' | 'hot' },
      });
      return { updated: res.count };
    }

    throw new BadRequestException('Unknown action');
  }

  async optOut(id: string, dto: OptOutLeadDto) {
    const lead = await this.prisma.scoped.lead.findFirst({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (!lead.phone && (dto.channel === OptOutChannel.whatsapp || dto.channel === OptOutChannel.call || dto.channel === OptOutChannel.sms)) {
      throw new BadRequestException('Lead has no phone — cannot opt out of phone-based channels');
    }

    // Upsert with composite unique key — pass tenantId explicitly via unscoped()
    // because the tenant extension intercepts create/find ops, not upsert's
    // nested `create` payload.
    await this.prisma.unscoped().$transaction(async (tx) => {
      if (lead.phone) {
        await tx.optOut.upsert({
          where: {
            tenantId_phone_channel: {
              tenantId: lead.tenantId,
              phone: lead.phone,
              channel: dto.channel,
            },
          },
          create: {
            tenantId: lead.tenantId,
            phone: lead.phone,
            channel: dto.channel,
            reason: dto.reason ?? null,
          },
          update: {
            reason: dto.reason ?? null,
          },
        });
      }
      await tx.lead.update({
        where: { id, tenantId: lead.tenantId },
        data: { status: LeadStatus.opted_out },
      });
    });

    return this.prisma.scoped.lead.findFirstOrThrow({ where: { id } });
  }

  private async resolveOfficeId(provided?: string): Promise<string> {
    if (provided) {
      await this.assertOfficeBelongsToTenant(provided);
      return provided;
    }
    const callerOfficeId = RequestContext.get().officeId;
    if (!callerOfficeId) {
      throw new BadRequestException('officeId required when caller has no current office');
    }
    return callerOfficeId;
  }

  private async assertOfficeBelongsToTenant(officeId: string) {
    const office = await this.prisma.scoped.office.findFirst({ where: { id: officeId } });
    if (!office) throw new NotFoundException(`Office ${officeId} not found in this tenant`);
  }

  private async assertUserBelongsToTenant(userId: string, expectedOfficeId?: string) {
    const user = await this.prisma.scoped.user.findFirst({
      where: { id: userId, status: { not: UserStatus.disabled } },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found in this tenant`);

    const callerRole = RequestContext.getRole();
    if (user.role === UserRole.platform_admin && callerRole !== UserRole.platform_admin) {
      throw new ForbiddenException('Cannot assign to platform_admin from tenant scope');
    }
    if (expectedOfficeId && user.officeId && user.officeId !== expectedOfficeId) {
      // Soft warning — we still allow it (a realtor may cover multiple offices),
      // but tightening here is easy if business rule changes.
    }
  }
}
