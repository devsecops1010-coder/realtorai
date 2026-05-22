import { IsBoolean, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpdateAgentConfigDto {
  @IsOptional()
  @IsString()
  @Length(10, 20_000)
  prompt?: string;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;

  @IsOptional()
  tools?: unknown[];

  @IsOptional()
  @IsObject()
  handoffRules?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
