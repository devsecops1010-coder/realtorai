import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  officeId: string | null;
  role: UserRole;
  type: 'access' | 'refresh';
  jti?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
