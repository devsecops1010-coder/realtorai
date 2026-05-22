import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('admin/tenants')
@Roles(UserRole.platform_admin)
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
}
