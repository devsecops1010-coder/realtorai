import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import { LeadInsightsService } from './lead-insights.service';
import { PropertyMatcherService } from './property-matcher.service';
import { BulkLeadsDto } from './dto/bulk-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { OptOutLeadDto } from './dto/opt-out-lead.dto';
import { ListLeadsQuery } from './dto/list-leads.query';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly insights: LeadInsightsService,
    private readonly matcher: PropertyMatcherService,
  ) {}

  @Get()
  list(@Query() query: ListLeadsQuery) {
    return this.leads.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.getById(id);
  }

  @Post()
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('lead.create', { targetType: 'lead' })
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('lead.update', { targetType: 'lead' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('lead.assign', { targetType: 'lead' })
  assign(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AssignLeadDto) {
    return this.leads.assign(id, dto);
  }

  /**
   * Import leads from a CSV payload. Body is `{ csv: string }` — the
   * import is small enough that JSON serialization is cheaper than the
   * multipart machinery (and the frontend FileReader already converts the
   * upload to a string).
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.office_owner,
    UserRole.office_manager,
    UserRole.team_lead,
    UserRole.branch_manager,
  )
  @Audit('lead.import', { targetType: 'lead' })
  importCsv(@Body() body: { csv: string }) {
    return this.leads.importCsv(body?.csv ?? '');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  // Bulk mutations are sensitive — restricted to management roles. Regular
  // realtors can still edit leads one by one via PATCH.
  @Roles(
    UserRole.office_owner,
    UserRole.office_manager,
    UserRole.team_lead,
    UserRole.branch_manager,
    UserRole.district_manager,
    UserRole.ceo,
    UserRole.deputy_ceo,
  )
  @Audit('lead.bulk', { targetType: 'lead' })
  bulk(@Body() dto: BulkLeadsDto) {
    return this.leads.bulk(dto.ids, dto.action, dto.value ?? null);
  }

  @Post(':id/opt-out')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('lead.opt_out', { targetType: 'lead' })
  optOut(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: OptOutLeadDto) {
    return this.leads.optOut(id, dto);
  }

  /**
   * Generate AI insights for a lead on-demand. POST rather than GET so we can
   * (a) audit each generation against the lead, (b) charge the LLM call to
   * the requesting user's tenant via the request context, and (c) avoid CDN
   * caching of what is effectively a write to UsageEvent.
   */
  @Post(':id/insights')
  @HttpCode(HttpStatus.OK)
  // Generating an insight isn't a state change on the lead itself but it is
  // a billable LLM call, so we restrict to staff roles that can act on it.
  @Roles(
    UserRole.office_owner,
    UserRole.office_manager,
    UserRole.realtor,
    UserRole.team_lead,
    UserRole.branch_manager,
    UserRole.district_manager,
    UserRole.ceo,
    UserRole.deputy_ceo,
  )
  @Audit('lead.insights_generated', { targetType: 'lead' })
  generateInsights(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.insights.generate(id);
  }

  /**
   * Find matching properties for a lead. Returns top-N scored matches.
   * GET (not POST) — no LLM call, just a DB query + in-memory scoring,
   * so idempotent + cacheable.
   */
  @Get(':id/property-matches')
  matches(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.matcher.findMatches(id);
  }
}
