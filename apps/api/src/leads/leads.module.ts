import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadInsightsService } from './lead-insights.service';

@Module({
  controllers: [LeadsController],
  // LlmRouterService comes from the @Global() LlmModule — no explicit import.
  providers: [LeadsService, LeadInsightsService],
  exports: [LeadsService],
})
export class LeadsModule {}
