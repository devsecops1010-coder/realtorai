import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ConversationsService } from './conversations.service';
import { QuickReplyService } from './quick-reply.service';
import { ListConversationsQuery } from './dto/list-conversations.query';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { HandoffDto } from './dto/handoff.dto';
import { SummaryDto } from './dto/summary.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly quickReply: QuickReplyService,
  ) {}

  @Get()
  list(@Query() query: ListConversationsQuery) {
    return this.conversations.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.conversations.getById(id);
  }

  @Post()
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('conversation.create', { targetType: 'conversation' })
  create(@Body() dto: CreateConversationDto) {
    return this.conversations.create(dto);
  }

  @Post(':id/handoff')
  @Audit('conversation.handoff', { targetType: 'conversation' })
  handoff(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: HandoffDto) {
    return this.conversations.handoff(id, dto);
  }

  @Post(':id/summary')
  @Audit('conversation.summary', { targetType: 'conversation' })
  summary(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: SummaryDto) {
    return this.conversations.setSummary(id, dto);
  }

  @Get(':id/messages')
  listMessages(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.conversations.listMessages(id);
  }

  @Post(':id/messages')
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('message.send', { targetType: 'message' })
  postMessage(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: PostMessageDto) {
    return this.conversations.postMessage(id, dto);
  }

  /**
   * Suggest an AI-drafted reply for the current conversation. The user
   * decides whether to send it as-is, edit, or ignore.
   */
  @Post(':id/suggest-reply')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.office_owner,
    UserRole.office_manager,
    UserRole.realtor,
    UserRole.team_lead,
  )
  @Audit('conversation.suggest_reply', { targetType: 'conversation' })
  suggestReply(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.quickReply.suggest(id);
  }
}
