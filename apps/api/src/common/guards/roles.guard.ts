import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role: UserRole | undefined = request.user?.role;
    if (!role) throw new ForbiddenException('No role on request');
    // platform_owner is the super-admin and is implicitly granted every role.
    if (role === 'platform_owner') return true;
    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Role ${role} not allowed`);
    }
    return true;
  }
}
