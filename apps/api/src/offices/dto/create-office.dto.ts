import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateOfficeDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  // Legacy free-text input — accepted for backward compatibility with existing
  // clients but new UI should send `areaIds` instead.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas?: string[];

  // Preferred input: UUIDs from /catalog/areas. The service translates these
  // into rows on the OfficeArea junction table and also denormalizes the
  // nameHe values back into the legacy `areas` column for backward-compat.
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
}
