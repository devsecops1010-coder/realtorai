import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateAdvisorDto {
  @IsString() @Length(2, 80) fullName!: string;
  // Optional identity fields — required only when generating bank
  // authorization letters. Stored once so we don't re-type per letter.
  @IsOptional() @IsString() @Length(5, 32) nationalId?: string;
  @IsOptional() @IsString() @Length(2, 32) licenseNumber?: string;
  @IsOptional() @IsString() @Length(2, 120) consultingCompany?: string;
  @IsOptional() @IsString() @Length(5, 16) consultingCompanyId?: string;
  @IsOptional() @IsString() @Length(2, 120) company?: string;
  @IsOptional() @IsString() @Length(6, 32) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(0, 1000) notes?: string;
  @IsOptional() @IsIn(['active', 'paused']) status?: 'active' | 'paused';
}
