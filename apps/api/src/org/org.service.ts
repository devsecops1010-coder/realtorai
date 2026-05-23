import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignOfficeToBranchDto,
  CreateBranchDto,
  CreateDistrictDto,
  CreateNetworkDto,
} from './dto/org.dto';

/**
 * Manages the Network/District/Branch hierarchy for the *current* tenant.
 * All operations are tenant-scoped via the Prisma extension — multi-tenant
 * managers (district_manager, branch_manager) still can't see across
 * tenant lines. Cross-tenant CRUD belongs in AdminService (platform).
 */
@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Networks --------------------------------------------------------

  listNetworks() {
    return this.prisma.scoped.network.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { districts: true, branches: true, offices: true } },
      },
    });
  }

  createNetwork(dto: CreateNetworkDto) {
    // tenantId injected by the scoped Prisma extension at runtime; the TS
    // types don't know that, hence the cast.
    return this.prisma.scoped.network.create({
      data: { name: dto.name.trim(), notes: dto.notes ?? null } as Prisma.NetworkUncheckedCreateInput,
    });
  }

  // --- Districts -------------------------------------------------------

  listDistricts() {
    return this.prisma.scoped.district.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        network: { select: { id: true, name: true } },
        _count: { select: { branches: true, offices: true } },
      },
    });
  }

  async createDistrict(dto: CreateDistrictDto) {
    if (dto.networkId) await this.assertNetworkExists(dto.networkId);
    return this.prisma.scoped.district.create({
      data: {
        name: dto.name.trim(),
        region: dto.region?.trim() ?? null,
        networkId: dto.networkId ?? null,
      } as Prisma.DistrictUncheckedCreateInput,
    });
  }

  // --- Branches --------------------------------------------------------

  listBranches() {
    return this.prisma.scoped.branch.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        network: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        _count: { select: { offices: true } },
      },
    });
  }

  async createBranch(dto: CreateBranchDto) {
    if (dto.networkId) await this.assertNetworkExists(dto.networkId);
    if (dto.districtId) await this.assertDistrictExists(dto.districtId);
    return this.prisma.scoped.branch.create({
      data: {
        name: dto.name.trim(),
        city: dto.city?.trim() ?? null,
        networkId: dto.networkId ?? null,
        districtId: dto.districtId ?? null,
      } as Prisma.BranchUncheckedCreateInput,
    });
  }

  // --- Office assignment -----------------------------------------------

  /**
   * Re-link an office to a branch (and optionally a district / network for
   * convenience). Validates the targets exist within the current tenant.
   */
  async assignOffice(officeId: string, dto: AssignOfficeToBranchDto) {
    const office = await this.prisma.scoped.office.findFirst({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Office not found');

    if (dto.branchId) await this.assertBranchExists(dto.branchId);
    if (dto.districtId) await this.assertDistrictExists(dto.districtId);
    if (dto.networkId) await this.assertNetworkExists(dto.networkId);

    // If only branchId is given, infer district/network from the branch so
    // we don't end up with an office in branch-X but district-Y.
    let { branchId, districtId, networkId } = dto;
    if (branchId && (!districtId || !networkId)) {
      const branch = await this.prisma.scoped.branch.findFirst({
        where: { id: branchId },
        select: { districtId: true, networkId: true },
      });
      if (branch) {
        districtId = districtId ?? branch.districtId ?? undefined;
        networkId = networkId ?? branch.networkId ?? undefined;
      }
    }
    // Same for district → network.
    if (districtId && !networkId) {
      const district = await this.prisma.scoped.district.findFirst({
        where: { id: districtId },
        select: { networkId: true },
      });
      if (district) networkId = district.networkId ?? undefined;
    }

    return this.prisma.scoped.office.update({
      where: { id: officeId },
      data: {
        branchId: branchId ?? null,
        districtId: districtId ?? null,
        networkId: networkId ?? null,
      },
    });
  }

  private async assertNetworkExists(id: string) {
    const n = await this.prisma.scoped.network.findFirst({ where: { id } });
    if (!n) throw new BadRequestException(`Network ${id} not found`);
  }
  private async assertDistrictExists(id: string) {
    const d = await this.prisma.scoped.district.findFirst({ where: { id } });
    if (!d) throw new BadRequestException(`District ${id} not found`);
  }
  private async assertBranchExists(id: string) {
    const b = await this.prisma.scoped.branch.findFirst({ where: { id } });
    if (!b) throw new BadRequestException(`Branch ${id} not found`);
  }
}
