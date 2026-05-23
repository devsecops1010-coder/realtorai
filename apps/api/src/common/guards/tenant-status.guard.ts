import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_SUSPENDED_KEY } from '../decorators/allow-suspended.decorator';

/**
 * Hard-stop guard for suspended tenants / inactive offices.
 *
 * Runs *after* JwtAuthGuard (so `req.user` is populated) and *before*
 * the request reaches the controller. Returns HTTP 451 with a structured
 * body so the web UI can route the user to a dedicated "החשבון מושעה"
 * screen instead of showing a raw 403.
 *
 * - `platform_owner` and `platform_admin` bypass — they need access to fix
 *   the situation. Any other role on a suspended tenant gets 451.
 * - `@AllowSuspended()` on a handler bypasses this guard so essentials like
 *   /auth/me, /auth/logout, and /billing/* keep working.
 * - `@Public()` routes don't have `req.user` and are skipped entirely.
 *
 * Cache: we issue one Prisma read per request to inspect tenant + office
 * status. That's ~0.5 ms on the local DB; acceptable for now. If it shows
 * up in profiles we can move to an in-memory LRU keyed on tenantId with a
 * short TTL invalidated on PATCH /suspend.
 */
@Injectable()
export class TenantStatusGuard implements CanActivate {
  private readonly logger = new Logger(TenantStatusGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public routes have no user — let them through.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    // Unauthenticated — JwtAuthGuard already would have blocked, but the
    // ThrottlerGuard runs first so we may be invoked. Defer to the next layer.
    if (!user) return true;

    // Platform-level routes (e.g. /admin/*) belong to platform admins. They
    // get to operate even if their own tenant is suspended (so the bootstrap
    // tenant can never lock itself out).
    if (user.role === 'platform_owner' || user.role === 'platform_admin') return true;

    // Exempt handlers — primarily auth.me / auth.logout / billing.* so a
    // suspended account can read its own state and act on the suspension.
    const allowSuspended = this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowSuspended) return true;

    // The user has a tenant. Look up status + office state in one round-trip.
    if (!user.tenantId) return true; // shouldn't happen for non-platform users
    const tenant = await this.prisma.unscoped().tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true, suspendedReason: true, suspendedAt: true },
    });
    if (!tenant) {
      // User's tenant was hard-deleted while their JWT was still valid — log
      // them out cleanly.
      throw new HttpException(
        { code: 'tenant_not_found', message: 'החשבון לא קיים' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (tenant.status === 'suspended') {
      this.logger.warn(`Blocked suspended tenant ${user.tenantId} on ${req.method} ${req.url}`);
      throw new HttpException(
        {
          code: 'tenant_suspended',
          message: 'החשבון מושעה',
          reason: tenant.suspendedReason,
          suspendedAt: tenant.suspendedAt,
        },
        // 451 Unavailable For Legal Reasons — semantically the closest match
        // for "you are blocked from using this service." The web UI maps it
        // to a dedicated suspended-account page.
        451,
      );
    }

    // Office-level inactivation: only enforced when the request *would*
    // touch officeId. A platform admin or a multi-office tenant member may
    // still operate while one branch is inactive.
    if (user.officeId) {
      const office = await this.prisma.unscoped().office.findUnique({
        where: { id: user.officeId },
        select: { status: true, inactivatedReason: true, inactivatedAt: true },
      });
      if (office?.status === 'inactive') {
        this.logger.warn(`Blocked inactive office ${user.officeId} on ${req.method} ${req.url}`);
        throw new HttpException(
          {
            code: 'office_inactive',
            message: 'הסניף מושבת',
            reason: office.inactivatedReason,
            inactivatedAt: office.inactivatedAt,
          },
          451,
        );
      }
    }

    return true;
  }
}

interface AuthUser {
  sub: string;
  tenantId?: string;
  officeId?: string;
  role?: UserRole;
}
