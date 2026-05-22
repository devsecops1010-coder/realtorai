import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { PropertyCondition, PropertyDealType, PropertyStatus } from '@prisma/client';

export class CreatePropertyDto {
  @IsEnum(PropertyDealType)
  dealType!: PropertyDealType;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsUUID()
  ownerLeadId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  area?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  street?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rooms?: number;

  @IsOptional()
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(PropertyCondition)
  condition?: PropertyCondition;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
