import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PERMISSION_MATRIX, PermissionKey, PermissionResult } from './matrix';

@Injectable()
export class PermissionsService {
  /**
   * Look up the matrix verdict for a (role, action) pair.
   *
   * `platform_owner` always evaluates to `allow` (super-admin). Anything
   * else falls through to the matrix; missing entries default to `deny`
   * — we'd rather block by accident than leak by omission.
   */
  evaluate(role: UserRole | undefined, key: PermissionKey): PermissionResult {
    if (!role) return 'deny';
    if (role === UserRole.platform_owner) return 'allow';
    if (role === UserRole.platform_admin) return 'allow';
    return PERMISSION_MATRIX[key]?.[role] ?? 'deny';
  }

  isAllowed(role: UserRole | undefined, key: PermissionKey): boolean {
    return this.evaluate(role, key) === 'allow';
  }
}
