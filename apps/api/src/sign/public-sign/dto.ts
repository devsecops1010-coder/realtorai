import { IsBoolean, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString() @Matches(/^\d{6}$/) otp!: string;
}

export class SubmitSignatureDto {
  @IsString() @Length(60, 500_000) signatureImage!: string;
  @IsBoolean() consent!: boolean;
}
