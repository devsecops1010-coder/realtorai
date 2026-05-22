import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateAdvisorDto {
  @IsString() @Length(2, 80) fullName!: string;
  @IsOptional() @IsString() @Length(2, 120) company?: string;
  @IsOptional() @IsString() @Length(6, 32) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(0, 1000) notes?: string;
  @IsOptional() @IsIn(['active', 'paused']) status?: 'active' | 'paused';
}
