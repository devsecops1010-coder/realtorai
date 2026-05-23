import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import type { PermissionKey } from '../permissions/matrix';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const role = context.switchToHttp().getRequest().user?.role as UserRole | undefined;

    // @RequirePermission('key') — matrix-based check. Takes precedence over
    // @Roles() if both decorators are present (they generally shouldn't be).
    const requiredPerm = this.reflector.getAllAndOverride<PermissionKey | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredPerm) {
      if (!role) throw new ForbiddenException('No role on request');
      const verdict = this.permissions.evaluate(role, requiredPerm);
      if (verdict === 'allow') return true;
      if (verdict === 'approval') {
        // 423 Locked communicates "the action requires approval workflow
        // that hasn't been triggered" — distinct from a flat 403.
        throw new HttpException(
          { message: `Action ${requiredPerm} requires approval`, code: 'approval_required' },
          HttpStatus.LOCKED,
        );
      }
      throw new ForbiddenException(`Role ${role} not allowed for ${requiredPerm}`);
    }

    // @Roles(role1, role2, ...) — legacy enumeration check.
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!role) throw new ForbiddenException('No role on request');
    // platform_owner is the super-admin and is implicitly granted every role.
    if (role === 'platform_owner') return true;
    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Role ${role} not allowed`);
    }
    return true;
  }
}
