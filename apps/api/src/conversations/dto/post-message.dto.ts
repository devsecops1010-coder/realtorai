import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { MessageSenderType } from '@prisma/client';

export class PostMessageDto {
  @IsString()
  @Length(1, 8000)
  body!: string;

  @IsOptional()
  @IsEnum(MessageSenderType)
  senderType?: MessageSenderType; // defaults to "user"
}
