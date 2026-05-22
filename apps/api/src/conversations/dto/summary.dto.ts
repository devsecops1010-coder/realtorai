import { IsString, Length } from 'class-validator';

export class SummaryDto {
  @IsString()
  @Length(1, 5000)
  summary!: string;
}
