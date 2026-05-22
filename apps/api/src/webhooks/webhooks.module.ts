import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
