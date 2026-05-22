import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @Length(2, 120)
  tenantName!: string;

  @IsString()
  @Length(2, 120)
  officeName!: string;

  @IsString()
  @Length(2, 80)
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;
}
