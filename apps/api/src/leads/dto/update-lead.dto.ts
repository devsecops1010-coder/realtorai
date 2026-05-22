import { PartialType } from '@nestjs/mapped-types';
import { IsISO8601, IsOptional } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @IsOptional()
  @IsISO8601()
  nextFollowupAt?: string;
}
