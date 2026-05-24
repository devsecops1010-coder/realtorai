import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GeoService } from './geo.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

/**
 * Public IL geo reference. Used by:
 *   - Property create/edit forms (autocomplete city + street)
 *   - Marketplace search filter (district + city pickers)
 *   - Address validation in lead forms (later)
 *
 * Everything is read-only & public except `POST /geo/seed` which is
 * platform-admin only and (re-)inserts the curated bootstrap data.
 */
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Public()
  @Get('districts')
  districts() {
    return this.geo.listDistricts();
  }

  @Public()
  @Get('sub-districts')
  subDistricts(@Query('districtId') districtId?: string) {
    return this.geo.listSubDistricts(districtId);
  }

  /**
   * Settlements autocomplete. `?q=...` for search, optional
   * `?districtId=...` / `?subDistrictId=...` to constrain. `?take=` to
   * raise the cap above 30 (max 200).
   */
  @Public()
  @Get('settlements')
  settlements(
    @Query('q') q?: string,
    @Query('districtId') districtId?: string,
    @Query('subDistrictId') subDistrictId?: string,
    @Query('take') take?: string,
  ) {
    return this.geo.searchSettlements({
      q,
      districtId,
      subDistrictId,
      take: take ? Number(take) : undefined,
    });
  }

  @Public()
  @Get('settlements/:id')
  settlement(@Param('id') id: string) {
    return this.geo.getSettlement(id);
  }

  /**
   * Streets within a settlement. `?settlementId=...` required.
   * `?q=...` substring filter. Returns empty list if the settlement
   * hasn't had its streets imported yet — the UI should fall back to
   * a free-text input in that case.
   */
  @Public()
  @Get('streets')
  streets(
    @Query('settlementId') settlementId: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.geo.searchStreets({
      settlementId,
      q,
      take: take ? Number(take) : undefined,
    });
  }

  /**
   * Cross-entity address suggest — used by global search bars. Tries
   * settlements + streets in parallel; returns a blended response.
   */
  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query('take') take?: string) {
    return this.geo.globalSearch(q ?? '', take ? Number(take) : undefined);
  }

  /**
   * (Re-)seed the reference data from the curated bootstrap.
   * Idempotent — safe to run on every deploy. Restricted to platform
   * admin/owner because seeding is a global write.
   */
  @Post('seed')
  @Roles(UserRole.platform_admin, UserRole.platform_owner)
  @Audit('geo.seed', { targetType: 'geo' })
  seed() {
    return this.geo.seedFromCurated();
  }
}
