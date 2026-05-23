import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class SuspendTenantDto {
  @IsString()
  @Length(2, 500)
  reason!: string;

  // Defaults to true in the service — set false to silently suspend (used by
  // tests + the rare "no email" scenario for compliance).
  @IsOptional()
  @IsBoolean()
  notifyOwner?: boolean;
}

export class ReactivateTenantDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  notifyOwner?: boolean;
}

export class SetPlanDto {
  @IsString()
  @Length(2, 40)
  planSlug!: string;
}
