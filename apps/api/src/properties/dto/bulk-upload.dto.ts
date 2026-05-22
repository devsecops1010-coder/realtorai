import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { PropertyDealType } from '@prisma/client';

export class OwnerLeadInputDto {
  @IsString()
  @Length(2, 80)
  ownerName!: string;

  @IsString()
  @Length(6, 32)
  ownerPhone!: string;

  @IsEnum(PropertyDealType)
  dealType!: PropertyDealType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class BulkUploadOwnersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => OwnerLeadInputDto)
  owners!: OwnerLeadInputDto[];
}
