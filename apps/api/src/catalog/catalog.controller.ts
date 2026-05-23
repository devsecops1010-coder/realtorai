import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

/**
 * Read-only catalogs for any authenticated user. The platform_admin write
 * endpoints live on AdminCatalogController under /admin/catalog/*.
 *
 * No tenant scoping — these tables are global. We deliberately do NOT mark
 * @Public() so the unauthenticated marketing site fetches plans via a
 * separate route (today: hardcoded /pricing page).
 */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('areas')
  listAreas() {
    return this.catalog.listAreas();
  }

  @Get('plans')
  listPlans() {
    return this.catalog.listPlans();
  }
}
