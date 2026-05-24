import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoImporterService } from './geo-importer.service';

/**
 * IL geo reference module — districts, sub-districts, settlements,
 * streets. Public read endpoints + admin-gated seed + CBS importers.
 */
@Module({
  controllers: [GeoController],
  providers: [GeoService, GeoImporterService],
  exports: [GeoService, GeoImporterService],
})
export class GeoModule {}
