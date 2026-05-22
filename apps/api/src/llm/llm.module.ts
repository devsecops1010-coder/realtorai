import { Global, Module } from '@nestjs/common';
import { LlmRouterService } from './llm-router.service';
import { UsageEventsService } from './usage-events.service';

@Global()
@Module({
  providers: [LlmRouterService, UsageEventsService],
  exports: [LlmRouterService, UsageEventsService],
})
export class LlmModule {}
