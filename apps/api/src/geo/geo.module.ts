import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

/**
 * IL geo reference module — districts, sub-districts, settlements,
 * streets. Public read endpoints + an admin-gated seed endpoint.
 */
@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
