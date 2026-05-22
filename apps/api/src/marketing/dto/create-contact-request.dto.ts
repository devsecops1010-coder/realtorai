import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateContactRequestDto {
  @IsString()
  @Length(2, 80)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(6, 32)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  officeName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  message?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  source?: string;
}
