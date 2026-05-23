import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService, ListAuditQuery } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Two routes:
 *   - GET /audit — tenant-scope. Office owners / managers see their tenant's
 *     audit trail. Auto-scoped by Prisma extension.
 *   - GET /admin/audit — platform admin only. Spans all tenants.
 */
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('audit')
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.platform_admin)
  list(@Query() query: ListAuditQuery) {
    return this.audit.list(query);
  }

  @Get('admin/audit')
  @Roles(UserRole.platform_admin)
  listAcrossTenants(@Query() query: ListAuditQuery) {
    return this.audit.listAcrossTenants(query);
  }
}
