import { IsBoolean, IsString, Length } from 'class-validator';

export class ConsentDto {
  @IsBoolean()
  consentToShareWithAdvisor!: boolean;

  @IsString()
  @Length(10, 2000)
  consentText!: string;
}
