import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@Roles(UserRole.platform_admin)
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
}
