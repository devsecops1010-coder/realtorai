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

  // Co-applicant (לווה 2 in bank auth forms) — typically the spouse/partner.
  // Optional; absent for single-borrower mortgages.
  @IsOptional() @IsString() @Length(2, 120) coApplicantName?: string;
  @IsOptional() @IsString() @Length(5, 32) coApplicantNationalId?: string;
  @IsOptional() @IsString() @Length(6, 32) coApplicantPhone?: string;

  @IsOptional() @IsString() @Length(0, 2000) notes?: string;
}
