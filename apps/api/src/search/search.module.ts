import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * Unified search endpoint. Fans out across leads, properties, tasks,
 * conversations, and users — returns a flat scored list capped at 5 per
 * type. Lives in its own module so the command-palette can hit one URL
 * instead of N parallel ones.
 */
@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
