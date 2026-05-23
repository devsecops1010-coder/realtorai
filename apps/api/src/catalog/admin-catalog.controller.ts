import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { CreateAreaDto, UpdateAreaDto } from './dto/area.dto';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Platform admin mutations on the global catalogs. Read endpoints stay on
 * CatalogController (any authenticated user). Each write is audited so we
 * have a paper trail of who edited the master list.
 */
@Controller('admin/catalog')
@Roles(UserRole.platform_owner, UserRole.platform_admin)
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ---------- Areas ---------------------------------------------------------

  @Get('areas')
  listAreas(@Query('includeInactive') includeInactive?: string) {
    return this.catalog.listAreas({ includeInactive: includeInactive === 'true' });
  }

  @Post('areas')
  @Audit('catalog.area.created', { targetType: 'area_catalog' })
  createArea(@Body() dto: CreateAreaDto) {
    return this.catalog.createArea(dto);
  }

  @Patch('areas/:id')
  @Audit('catalog.area.updated', { targetType: 'area_catalog' })
  updateArea(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAreaDto) {
    return this.catalog.updateArea(id, dto);
  }

  // ---------- Plans ---------------------------------------------------------

  @Get('plans')
  listPlans(@Query('includeInactive') includeInactive?: string) {
    return this.catalog.listPlans({ includeInactive: includeInactive === 'true' });
  }

  @Post('plans')
  @Audit('catalog.plan.created', { targetType: 'plan_catalog' })
  createPlan(@Body() dto: CreatePlanDto) {
    // `features` is open-schema JSON. class-validator parses it as Record but
    // Prisma's typed JsonValue requires the immutable variant — cast at the
    // boundary so the service signature stays strict.
    const features = dto.features as Prisma.InputJsonValue | undefined;
    return this.catalog.createPlan({ ...dto, features });
  }

  @Patch('plans/:id')
  @Audit('catalog.plan.updated', { targetType: 'plan_catalog' })
  updatePlan(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePlanDto) {
    const features = dto.features as Prisma.InputJsonValue | undefined;
    return this.catalog.updatePlan(id, { ...dto, features });
  }
}
