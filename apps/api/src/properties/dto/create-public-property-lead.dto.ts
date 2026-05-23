import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreatePublicPropertyLeadDto {
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Length(6, 32)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1200)
  message?: string;
}
