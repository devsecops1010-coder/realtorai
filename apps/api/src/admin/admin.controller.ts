import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { SetupOfficeDto } from './dto/setup-office.dto';
import { DeactivateOfficeDto } from './dto/deactivate-office.dto';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('admin')
@Roles(UserRole.platform_owner, UserRole.platform_admin)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('usage')
  usage() {
    return this.admin.usageByTenant();
  }

  @Get('health')
  health() {
    return this.admin.platformHealth();
  }

  @Get('revenue')
  revenue() {
    return this.admin.revenueSummary();
  }

  @Post('offices/setup')
  @Audit('admin.office_setup', { targetType: 'tenant' })
  setupOffice(@Body() dto: SetupOfficeDto) {
    return this.admin.setupOffice(dto);
  }

  @Get('offices/:id')
  async officeDetail(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.admin.officeDetail(id);
    if (!data) throw new NotFoundException('Office not found');
    return data;
  }

  @Patch('offices/:id/deactivate')
  @Audit('office.deactivated', { targetType: 'office' })
  deactivateOffice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeactivateOfficeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admin.deactivateOffice({
      officeId: id,
      reason: dto.reason,
      actorUserId: user.sub,
    });
  }

  @Patch('offices/:id/reactivate')
  @Audit('office.reactivated', { targetType: 'office' })
  reactivateOffice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admin.reactivateOffice({ officeId: id, actorUserId: user.sub });
  }
}
