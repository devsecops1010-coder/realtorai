import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { RequestContext } from '../common/context/request-context';

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOfficeDto) {
    // tenantId is injected at runtime by the tenant-scope Prisma extension.
    const data: Omit<Prisma.OfficeUncheckedCreateInput, 'tenantId'> = {
      name: dto.name.trim(),
      city: dto.city?.trim() ?? null,
      areas: dto.areas ?? [],
      phone: dto.phone ?? null,
      whatsappNumber: dto.whatsappNumber ?? null,
    };
    return this.prisma.scoped.office.create({ data: data as Prisma.OfficeUncheckedCreateInput });
  }

  async getCurrent() {
    const officeId = RequestContext.get().officeId;
    if (!officeId) throw new ForbiddenException('User has no office assigned');
    const office = await this.prisma.scoped.office.findFirst({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  async getById(id: string) {
    const office = await this.prisma.scoped.office.findFirst({ where: { id } });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  async updateCurrent(dto: UpdateOfficeDto) {
    const officeId = RequestContext.get().officeId;
    if (!officeId) throw new ForbiddenException('User has no office assigned');
    return this.prisma.scoped.office.update({
      where: { id: officeId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.city !== undefined && { city: dto.city.trim() }),
        ...(dto.areas !== undefined && { areas: dto.areas }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.whatsappNumber !== undefined && { whatsappNumber: dto.whatsappNumber }),
      },
    });
  }
}
