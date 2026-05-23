import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ReactivateTenantDto, SetPlanDto, SuspendTenantDto } from './dto/suspension.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('admin/tenants')
@Roles(UserRole.platform_owner, UserRole.platform_admin)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list() {
    return this.tenants.list();
  }

  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenants.getById(id);
  }

  @Post()
  @Audit('tenant.admin_create', { targetType: 'tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Patch(':id/suspend')
  @Audit('tenant.suspended', { targetType: 'tenant' })
  suspend(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SuspendTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenants.suspend({
      tenantId: id,
      reason: dto.reason,
      actorUserId: user.sub,
      notifyOwner: dto.notifyOwner,
    });
  }

  @Patch(':id/reactivate')
  @Audit('tenant.reactivated', { targetType: 'tenant' })
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReactivateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenants.reactivate({
      tenantId: id,
      note: dto.note,
      actorUserId: user.sub,
      notifyOwner: dto.notifyOwner,
    });
  }

  @Patch(':id/plan')
  @Audit('tenant.plan_changed', { targetType: 'tenant' })
  setPlan(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetPlanDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenants.setPlan({ tenantId: id, planSlug: dto.planSlug, actorUserId: user.sub });
  }
}
