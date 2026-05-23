import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadStatus, LeadTemperature } from '@prisma/client';

/**
 * Bulk update DTO. One action per call (assign | status | temperature) keeps
 * the validation simple and avoids cross-field rules. Max 200 to cap the
 * single-transaction blast radius — bulk operations should be visible, not
 * accidental.
 */
export class BulkLeadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsEnum(['assign', 'status', 'temperature', 'delete'] as const)
  action!: 'assign' | 'status' | 'temperature' | 'delete';

  /**
   * Value depends on the action:
   *   - assign      → userId (uuid) or null to unassign
   *   - status      → LeadStatus enum
   *   - temperature → LeadTemperature enum
   *   - delete      → ignored
   */
  @IsOptional()
  @IsString()
  value?: string | null;
}
