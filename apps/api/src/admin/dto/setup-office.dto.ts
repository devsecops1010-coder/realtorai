import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class SetupOfficeDto {
  @IsString()
  @Length(2, 120)
  tenantName!: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  tenantStatus?: TenantStatus;

  // Legacy free-text slug — still accepted for backward-compat. New UI sends
  // `planSlug` (which is resolved against PlanCatalog) instead.
  @IsOptional()
  @IsString()
  @Length(2, 40)
  plan?: string;

  // Catalog-backed plan slug. If provided, AdminService loads the matching
  // PlanCatalog row and applies its billing defaults to the new tenant.
  @IsOptional()
  @IsString()
  @Length(2, 40)
  planSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  setupFeeIls?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPlanIls?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  includedMessages?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  includedCallMinutes?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  monthlyLlmBudgetUsd?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  billingNotes?: string;

  @IsString()
  @Length(2, 120)
  officeName!: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  areas?: string[];

  // Preferred input from new UI — UUIDs from /catalog/areas.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  areaIds?: string[];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsString()
  @Length(2, 80)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/)
  ownerPassword!: string;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  leadResponderTone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  propertyRecruiterTone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  workingHours?: string;
}
