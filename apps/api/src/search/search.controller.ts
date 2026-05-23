import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /**
   * Unified search. `q` is the query string (min 2 chars, enforced by the
   * service). Returns up to 25 hits (5 per entity type).
   *
   * Not paginated — the goal is a fast in-palette response, not a search
   * page. If we ever need a full search page, add /search/page with
   * pagination semantics.
   */
  @Get()
  query(@Query('q') q?: string) {
    return this.search.search(q ?? '');
  }
}
