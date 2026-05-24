import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GeoService } from './geo.service';
import { GeoImporterService } from './geo-importer.service';
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
  constructor(
    private readonly geo: GeoService,
    private readonly importer: GeoImporterService,
  ) {}

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
   * Neighborhoods (שכונות) within a settlement. `?settlementId=` required.
   * Returns empty list for cities we haven't curated — UI should let
   * the user skip neighborhood and go straight to street.
   */
  @Public()
  @Get('neighborhoods')
  neighborhoods(
    @Query('settlementId') settlementId: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.geo.searchNeighborhoods({
      settlementId,
      q,
      take: take ? Number(take) : undefined,
    });
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

  /**
   * Pull the full ~1,306-settlement list from CBS / data.gov.il. Runs
   * synchronously and returns counts. Takes ~30-60s. Idempotent — safe
   * to re-run; CBS publishes monthly.
   */
  @Post('import/settlements')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.platform_admin, UserRole.platform_owner)
  @Audit('geo.import.settlements', { targetType: 'geo' })
  importSettlements() {
    return this.importer.importSettlements();
  }

  /**
   * Pull the full ~63,563-street list from CBS / data.gov.il. Runs
   * synchronously, ~3-5 minutes. Settlements must already be imported.
   * `?onlyMissing=true` skips settlements that already have streets —
   * useful for incremental re-imports without redoing the whole load.
   */
  @Post('import/streets')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.platform_admin, UserRole.platform_owner)
  @Audit('geo.import.streets', { targetType: 'geo' })
  importStreets(@Query('onlyMissing') onlyMissing?: string) {
    return this.importer.importStreets({
      onlyMissing: onlyMissing === 'true' || onlyMissing === '1',
    });
  }
}
