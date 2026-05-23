import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { OrgService } from './org.service';
import {
  AssignOfficeToBranchDto,
  CreateBranchDto,
  CreateDistrictDto,
  CreateNetworkDto,
} from './dto/org.dto';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { Audit } from '../common/decorators/audit.decorator';

/**
 * Tenant-scope hierarchy management. Routes:
 *   GET /org/networks  /districts  /branches
 *   POST /org/networks  /districts  /branches
 *   PATCH /org/offices/:id/assign  → re-link office to branch/district/network
 *
 * Gated by `user.manage` for now since the same set of roles (CEO / regional
 * managers / office_owner) should be the ones drawing the org chart.
 */
@Controller('org')
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get('networks')
  @RequirePermission('see.network')
  listNetworks() {
    return this.org.listNetworks();
  }

  @Post('networks')
  @RequirePermission('user.manage')
  @Audit('org.network.create', { targetType: 'network' })
  createNetwork(@Body() dto: CreateNetworkDto) {
    return this.org.createNetwork(dto);
  }

  @Get('districts')
  @RequirePermission('see.district')
  listDistricts() {
    return this.org.listDistricts();
  }

  @Post('districts')
  @RequirePermission('user.manage')
  @Audit('org.district.create', { targetType: 'district' })
  createDistrict(@Body() dto: CreateDistrictDto) {
    return this.org.createDistrict(dto);
  }

  @Get('branches')
  @RequirePermission('see.branch')
  listBranches() {
    return this.org.listBranches();
  }

  @Post('branches')
  @RequirePermission('user.manage')
  @Audit('org.branch.create', { targetType: 'branch' })
  createBranch(@Body() dto: CreateBranchDto) {
    return this.org.createBranch(dto);
  }

  @Patch('offices/:id/assign')
  @RequirePermission('user.manage')
  @Audit('org.office.assign', { targetType: 'office' })
  assignOffice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignOfficeToBranchDto,
  ) {
    return this.org.assignOffice(id, dto);
  }
}
