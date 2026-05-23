import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadInsightsService } from './lead-insights.service';
import { PropertyMatcherService } from './property-matcher.service';

@Module({
  controllers: [LeadsController],
  // LlmRouterService comes from the @Global() LlmModule — no explicit import.
  providers: [LeadsService, LeadInsightsService, PropertyMatcherService],
  exports: [LeadsService],
})
export class LeadsModule {}
