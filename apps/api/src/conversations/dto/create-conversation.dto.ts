import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ConversationChannel } from '@prisma/client';

export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsEnum(ConversationChannel)
  channel!: ConversationChannel;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;
}
