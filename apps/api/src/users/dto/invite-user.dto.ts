import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsUUID()
  officeId?: string;
}
