import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Za-z0-9\s_-]+$/, { message: 'slug must be ASCII alphanumeric with - / _' })
  slug!: string;

  @IsString()
  @Length(1, 80)
  nameHe!: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  tagline?: string;

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

  // Decimals come over the wire as strings to preserve precision.
  @IsOptional()
  @IsNumberString()
  monthlyLlmBudgetUsd?: string;

  @IsOptional()
  @IsNumberString()
  extraMessageIls?: string;

  @IsOptional()
  @IsNumberString()
  extraCallMinuteIls?: string;

  @IsOptional()
  @IsNumberString()
  successFeePct?: string;

  // Schema-less feature flags — UI handles the shape. We just accept any
  // JSON-serializable object here.
  @IsOptional()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  nameHe?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  tagline?: string;

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
  @IsNumberString()
  monthlyLlmBudgetUsd?: string;

  @IsOptional()
  @IsNumberString()
  extraMessageIls?: string;

  @IsOptional()
  @IsNumberString()
  extraCallMinuteIls?: string;

  @IsOptional()
  @IsNumberString()
  successFeePct?: string;

  @IsOptional()
  features?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
