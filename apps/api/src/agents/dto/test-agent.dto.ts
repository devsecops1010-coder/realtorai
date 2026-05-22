import { IsOptional, IsString, Length } from 'class-validator';

export class TestAgentDto {
  @IsString()
  @Length(1, 4000)
  message!: string;

  @IsOptional()
  @IsString()
  @Length(6, 32)
  leadPhone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  leadName?: string;
}
