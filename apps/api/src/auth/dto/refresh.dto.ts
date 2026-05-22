import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @IsString()
  @Length(20, 1024)
  refreshToken!: string;
}
