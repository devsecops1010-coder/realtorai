import { IsString, Length } from 'class-validator';

export class DeactivateOfficeDto {
  @IsString()
  @Length(2, 500)
  reason!: string;
}
