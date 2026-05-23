import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateNetworkDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @Length(0, 1000) notes?: string;
}

export class CreateDistrictDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @Length(0, 80) region?: string;
  @IsOptional() @IsUUID() networkId?: string;
}

export class CreateBranchDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @Length(0, 80) city?: string;
  @IsOptional() @IsUUID() networkId?: string;
  @IsOptional() @IsUUID() districtId?: string;
}

export class AssignOfficeToBranchDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() districtId?: string;
  @IsOptional() @IsUUID() networkId?: string;
}
