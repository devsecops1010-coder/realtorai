import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Matches,
} from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @Length(2, 60)
  // Allow user input, normalize at service level
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
  @Length(0, 40)
  region?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdateAreaDto {
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
  @Length(0, 40)
  region?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
