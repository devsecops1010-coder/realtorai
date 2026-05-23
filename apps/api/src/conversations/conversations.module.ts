import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { QuickReplyService } from './quick-reply.service';

@Module({
  controllers: [ConversationsController],
  // LlmRouterService comes from the @Global() LlmModule.
  providers: [ConversationsService, QuickReplyService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
