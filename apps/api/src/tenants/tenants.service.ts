import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Called only from platform_admin endpoints.
  list() {
    return this.prisma.unscoped().tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { offices: true, users: true } } },
    });
  }

  async getById(id: string) {
    const tenant = await this.prisma.unscoped().tenant.findUnique({
      where: { id },
      include: { offices: true, _count: { select: { users: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
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
}
