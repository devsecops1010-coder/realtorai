import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OptOutChannel } from '@prisma/client';

export class OptOutLeadDto {
  @IsEnum(OptOutChannel)
  channel!: OptOutChannel;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}
