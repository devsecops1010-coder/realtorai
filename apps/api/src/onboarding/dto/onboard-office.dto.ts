import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class OnboardOfficeDto {
  @IsString() @Length(2, 120) tenantName!: string;
  @IsString() @Length(2, 120) officeName!: string;
  @IsString() @Length(2, 80) ownerName!: string;
  @IsEmail() email!: string;
  @IsString() @Length(8, 128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/) password!: string;

  @IsOptional() @IsString() @Length(2, 80) city?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) areas?: string[];
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsString() @Length(0, 4000) leadResponderTone?: string;
  @IsOptional() @IsString() @Length(0, 4000) propertyRecruiterTone?: string;
  @IsOptional() @IsString() @Length(0, 200) workingHours?: string;
}
