import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ReferDto {
  @IsUUID()
  advisorId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
