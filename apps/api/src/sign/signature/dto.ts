import { IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateSignatureRequestDto {
  @IsUUID() documentId!: string;
  @IsString() @Length(2, 120) signerName!: string;
  @IsEmail() signerEmail!: string;
  @IsOptional() @IsString() @Length(7, 25) signerPhone?: string;
}
