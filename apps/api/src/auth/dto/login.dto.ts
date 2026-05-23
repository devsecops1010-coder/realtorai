import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  // Optional 2FA code. If the user has 2FA enabled, the first login call
  // returns `{ requires2fa: true }` and the client sends the same email +
  // password + this `totpCode` in a follow-up call. 6-digit TOTP or
  // 11-char recovery code accepted.
  @IsOptional()
  @IsString()
  @Length(6, 16)
  totpCode?: string;
}
