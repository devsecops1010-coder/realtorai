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
