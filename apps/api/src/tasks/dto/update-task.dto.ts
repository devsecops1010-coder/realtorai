import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { TaskStatus, TaskType } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}
