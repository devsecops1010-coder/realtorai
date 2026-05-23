import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../permissions/matrix';

export const PERMISSION_KEY = 'permission';

/**
 * Mark a route handler as requiring a specific permission. Evaluated by
 * `RolesGuard` (which also handles `@Roles()`). Either decorator alone is
 * sufficient — both compose if specified.
 *
 * Example:
 *   `@Permission('lead.delete')` on a DELETE handler.
 */
export const RequirePermission = (key: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, key);
