import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadIntent,
  LeadStatus,
  LeadTemperature,
  Prisma,
  PropertyDealType,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { BulkUploadOwnersDto, OwnerLeadInputDto } from './dto/bulk-upload.dto';
import { CreatePublicPropertyLeadDto } from './dto/create-public-property-lead.dto';
import { PublicPropertySearchQuery } from './dto/public-property-search.query';

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

  /**
   * Public detail view for a single property. Mirrors the column selection
   * of `publicSearch()` plus the related office contact info so the
   * /marketplace/[id] page has everything it needs in one round-trip.
   * Returns 404 if the property doesn't exist or isn't `active` — drafts,
   * pending and sold properties stay invisible to the public.
   */
  async publicGetById(id: string) {
    const property = await this.prisma.unscoped().property.findFirst({
      where: { id, status: PropertyStatus.active },
      select: {
        id: true,
        dealType: true,
        city: true,
        area: true,
        street: true,
        rooms: true,
        floor: true,
        price: true,
        condition: true,
        coverImageUrl: true,
        galleryUrls: true,
        // Amenities — power the "מה יש בנכס" grid in the detail page.
        hasParking: true,
        hasSafeRoom: true,
        isFurnished: true,
        hasStorage: true,
        hasBalcony: true,
        isExclusive: true,
        hasAirCon: true,
        hasBars: true,
        hasElevator: true,
        isAccessible: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        office: {
          select: {
            id: true,
            name: true,
            city: true,
            phone: true,
            whatsappNumber: true,
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async publicSearch(query: PublicPropertySearchQuery) {
    const take = query.take ?? 24;
    const skip = query.skip ?? 0;
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.active,
    };

    if (query.dealType) where.dealType = query.dealType;
    if (query.city) where.city = { contains: query.city.trim(), mode: 'insensitive' };
    if (query.area) where.area = { contains: query.area.trim(), mode: 'insensitive' };
    if (query.minRooms !== undefined) where.rooms = { gte: query.minRooms };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { city: { contains: q, mode: 'insensitive' } },
        { area: { contains: q, mode: 'insensitive' } },
        { street: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.unscoped().property.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take,
        skip,
        select: {
          id: true,
          dealType: true,
          city: true,
          area: true,
          street: true,
          rooms: true,
          floor: true,
          price: true,
          condition: true,
          coverImageUrl: true,
          galleryUrls: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          office: {
            select: {
              id: true,
              name: true,
              city: true,
              phone: true,
              whatsappNumber: true,
            },
          },
        },
      }),
      this.prisma.unscoped().property.count({ where }),
    ]);

    return { items, total, take, skip };
  }

  async createPublicLead(propertyId: string, dto: CreatePublicPropertyLeadDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Phone or email is required');
    }

    const property = await this.prisma.unscoped().property.findFirst({
      where: { id: propertyId, status: PropertyStatus.active },
      select: {
        id: true,
        tenantId: true,
        officeId: true,
        dealType: true,
        city: true,
        area: true,
        street: true,
        rooms: true,
        price: true,
      },
    });
    if (!property) throw new NotFoundException('Public property not found');

    const notes = [
      'Public marketplace inquiry',
      property.street ? `Property street: ${property.street}` : null,
      property.city ? `City: ${property.city}` : null,
      property.area ? `Area: ${property.area}` : null,
      property.rooms ? `Rooms: ${property.rooms}` : null,
      property.price ? `Price: ${property.price}` : null,
      dto.message ? `Message: ${dto.message.trim()}` : null,
    ].filter(Boolean).join('\n');

    const lead = await this.prisma.unscoped().lead.create({
      data: {
        tenantId: property.tenantId,
        officeId: property.officeId,
        source: 'marketplace_property',
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() ?? null,
        email: dto.email?.toLowerCase().trim() ?? null,
        intent: property.dealType === PropertyDealType.sale ? LeadIntent.buy : LeadIntent.rent,
        city: property.city,
        area: property.area,
        budgetMax: property.price,
        rooms: property.rooms,
        status: LeadStatus.new,
        temperature: LeadTemperature.warm,
        notes,
      },
      select: {
        id: true,
        status: true,
        temperature: true,
        createdAt: true,
      },
    });

    return { lead };
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
      coverImageUrl: dto.coverImageUrl ?? null,
      galleryUrls: dto.galleryUrls as Prisma.InputJsonValue | undefined,
      // Amenities — default false on create. Each field is a boolean column
      // on Property; the migration's @default(false) handles omitted ones.
      hasParking: dto.hasParking ?? false,
      hasSafeRoom: dto.hasSafeRoom ?? false,
      isFurnished: dto.isFurnished ?? false,
      hasStorage: dto.hasStorage ?? false,
      hasBalcony: dto.hasBalcony ?? false,
      isExclusive: dto.isExclusive ?? false,
      hasAirCon: dto.hasAirCon ?? false,
      hasBars: dto.hasBars ?? false,
      hasElevator: dto.hasElevator ?? false,
      isAccessible: dto.isAccessible ?? false,
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
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.galleryUrls !== undefined) data.galleryUrls = dto.galleryUrls as Prisma.InputJsonValue;
    // Amenities — only touch what the caller sent; an omitted amenity
    // stays unchanged so partial updates don't reset the checklist.
    if (dto.hasParking !== undefined) data.hasParking = dto.hasParking;
    if (dto.hasSafeRoom !== undefined) data.hasSafeRoom = dto.hasSafeRoom;
    if (dto.isFurnished !== undefined) data.isFurnished = dto.isFurnished;
    if (dto.hasStorage !== undefined) data.hasStorage = dto.hasStorage;
    if (dto.hasBalcony !== undefined) data.hasBalcony = dto.hasBalcony;
    if (dto.isExclusive !== undefined) data.isExclusive = dto.isExclusive;
    if (dto.hasAirCon !== undefined) data.hasAirCon = dto.hasAirCon;
    if (dto.hasBars !== undefined) data.hasBars = dto.hasBars;
    if (dto.hasElevator !== undefined) data.hasElevator = dto.hasElevator;
    if (dto.isAccessible !== undefined) data.isAccessible = dto.isAccessible;
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
