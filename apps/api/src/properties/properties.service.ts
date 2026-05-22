import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadIntent, LeadStatus, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { BulkUploadOwnersDto, OwnerLeadInputDto } from './dto/bulk-upload.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.scoped.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ownerLead: { select: { id: true, fullName: true, phone: true } },
        office: { select: { id: true, name: true } },
      },
      take: 200,
    });
  }

  async getById(id: string) {
    const property = await this.prisma.scoped.property.findFirst({
      where: { id },
      include: {
        ownerLead: { select: { id: true, fullName: true, phone: true, email: true } },
        office: { select: { id: true, name: true } },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(dto: CreatePropertyDto) {
    const officeId = await this.resolveOfficeId(dto.officeId);
    if (dto.ownerLeadId) {
      const lead = await this.prisma.scoped.lead.findFirst({ where: { id: dto.ownerLeadId } });
      if (!lead) throw new NotFoundException('Owner lead not found');
    }

    const data: Omit<Prisma.PropertyUncheckedCreateInput, 'tenantId'> = {
      officeId,
      ownerLeadId: dto.ownerLeadId ?? null,
      dealType: dto.dealType,
      city: dto.city ?? null,
      area: dto.area ?? null,
      street: dto.street ?? null,
      rooms: dto.rooms ?? null,
      floor: dto.floor ?? null,
      price: dto.price ?? null,
      condition: dto.condition ?? null,
      status: dto.status ?? PropertyStatus.draft,
      notes: dto.notes ?? null,
    };
    return this.prisma.scoped.property.create({
      data: data as Prisma.PropertyUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdatePropertyDto) {
    const existing = await this.prisma.scoped.property.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Property not found');

    const data: Prisma.PropertyUncheckedUpdateInput = {};
    if (dto.officeId !== undefined) data.officeId = dto.officeId;
    if (dto.ownerLeadId !== undefined) data.ownerLeadId = dto.ownerLeadId;
    if (dto.dealType !== undefined) data.dealType = dto.dealType;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.street !== undefined) data.street = dto.street;
    if (dto.rooms !== undefined) data.rooms = dto.rooms;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.scoped.property.update({ where: { id }, data });
  }

  async bulkUploadOwners(dto: BulkUploadOwnersDto) {
    const officeId = RequestContext.get().officeId;
    if (!officeId) throw new BadRequestException('Office context required');
    const tenantId = RequestContext.getTenantId()!;

    const created: { leadId: string; propertyId: string }[] = [];
    for (const o of dto.owners) {
      created.push(await this.createOneOwnerWithProperty(tenantId, officeId, o));
    }
    return { created, count: created.length };
  }

  private async createOneOwnerWithProperty(
    tenantId: string,
    officeId: string,
    o: OwnerLeadInputDto,
  ): Promise<{ leadId: string; propertyId: string }> {
    return this.prisma.unscoped().$transaction(async (tx) => {
      // Lead has no unique on phone, so find-or-create manually.
      const existing = await tx.lead.findFirst({
        where: { tenantId, officeId, phone: o.ownerPhone.trim() },
      });
      const lead =
        existing ??
        (await tx.lead.create({
          data: {
            tenantId,
            officeId,
            fullName: o.ownerName.trim(),
            phone: o.ownerPhone.trim(),
            intent: o.dealType === 'sale' ? LeadIntent.sell : LeadIntent.list_for_rent,
            source: 'owner_upload',
            status: LeadStatus.new,
            temperature: 'cold',
            city: o.city ?? null,
            area: o.area ?? null,
            notes: o.notes ?? null,
          },
        }));

      const property = await tx.property.create({
        data: {
          tenantId,
          officeId,
          ownerLeadId: lead.id,
          dealType: o.dealType,
          city: o.city ?? null,
          area: o.area ?? null,
          street: o.street ?? null,
          rooms: o.rooms ?? null,
          price: o.price ?? null,
          status: PropertyStatus.draft,
          notes: o.notes ?? null,
        },
      });

      return { leadId: lead.id, propertyId: property.id };
    });
  }

  private async resolveOfficeId(provided?: string): Promise<string> {
    if (provided) {
      const office = await this.prisma.scoped.office.findFirst({ where: { id: provided } });
      if (!office) throw new NotFoundException(`Office ${provided} not found`);
      return provided;
    }
    const callerOfficeId = RequestContext.get().officeId;
    if (!callerOfficeId) throw new BadRequestException('officeId required');
    return callerOfficeId;
  }
}
