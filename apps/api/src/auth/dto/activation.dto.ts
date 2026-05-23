import { IsString, Length, Matches } from 'class-validator';

export class CompleteActivationDto {
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one digit',
  })
  password!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @Length(3, 254)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one digit',
  })
  password!: string;
}
