import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { MortgageReadiness, MortgageStatus } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional() @IsInt() @Min(0) estimatedPrice?: number;
  @IsOptional() @IsInt() @Min(0) estimatedEquity?: number;
  @IsOptional() @IsBoolean() hasPreApproval?: boolean;
  @IsOptional() @IsInt() @Min(0) preApprovalAmount?: number;
  @IsOptional() @IsString() @Length(1, 60) preApprovalBank?: string;
  @IsOptional() @IsInt() @Min(0) monthlyIncome?: number;

  @IsOptional() @IsEnum(MortgageStatus) status?: MortgageStatus;
  @IsOptional() @IsInt() @Min(0) readinessScore?: number;
  @IsOptional() @IsEnum(MortgageReadiness) readiness?: MortgageReadiness;

  @IsOptional() @IsString() @Length(0, 2000) notes?: string;
}
