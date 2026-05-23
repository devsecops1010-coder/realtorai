import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PropertyDealType } from '@prisma/client';

function optionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseInt(String(value), 10);
}

function optionalFloat(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseFloat(String(value));
}

export class PublicPropertySearchQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(PropertyDealType)
  dealType?: PropertyDealType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => optionalFloat(value))
  @IsNumber()
  @Min(0)
  minRooms?: number;

  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 24;

  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt()
  @Min(0)
  skip?: number = 0;
}
