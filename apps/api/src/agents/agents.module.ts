import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentOrchestratorService } from './orchestrator.service';
import { ToolsService } from './tools/tools.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AgentsController],
  providers: [AgentsService, AgentOrchestratorService, ToolsService],
  exports: [AgentOrchestratorService, ToolsService],
})
export class AgentsModule {}
