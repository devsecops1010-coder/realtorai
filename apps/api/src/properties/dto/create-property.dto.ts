import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
  @IsString()
  @Length(1, 500)
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  galleryUrls?: string[];

  // Amenities — power the "מה יש בנכס" public detail grid. All optional;
  // omitted = leave as-is on update, default false on create.
  @IsOptional() @IsBoolean() hasParking?: boolean;
  @IsOptional() @IsBoolean() hasSafeRoom?: boolean;
  @IsOptional() @IsBoolean() isFurnished?: boolean;
  @IsOptional() @IsBoolean() hasStorage?: boolean;
  @IsOptional() @IsBoolean() hasBalcony?: boolean;
  @IsOptional() @IsBoolean() isExclusive?: boolean;
  @IsOptional() @IsBoolean() hasAirCon?: boolean;
  @IsOptional() @IsBoolean() hasBars?: boolean;
  @IsOptional() @IsBoolean() hasElevator?: boolean;
  @IsOptional() @IsBoolean() isAccessible?: boolean;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
