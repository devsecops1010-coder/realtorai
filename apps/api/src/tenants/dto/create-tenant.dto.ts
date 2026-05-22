import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsString()
  @Length(2, 40)
  plan?: string;
}
