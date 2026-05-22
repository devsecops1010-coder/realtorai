import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { Prisma } from '@prisma/client';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AUDIT_ACTION_KEY, AuditOptions } from '../decorators/audit.decorator';
import type { RequestContextData } from '../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService<RequestContextData>,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.getAllAndOverride<AuditOptions>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!opts) return next.handle();

    const req = context.switchToHttp().getRequest();
    const tenantId = this.cls.get('tenantId') ?? req.user?.tenantId;
    const userId = this.cls.get('userId') ?? req.user?.sub;
    const ip = req.ip ?? req.headers?.['x-forwarded-for'];

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.prisma.unscoped().auditLog.create({
            data: {
              tenantId: tenantId ?? null,
              actorType: userId ? 'user' : 'system',
              actorId: userId ?? null,
              action: opts.action,
              targetType: opts.targetType ?? null,
              targetId: this.extractTargetId(result),
              metadata: this.buildMetadata(req, result) as Prisma.InputJsonValue,
            },
          });
        } catch (err) {
          this.logger.error(`Failed to write audit log for ${opts.action}`, err);
        }
      }),
      catchError((error) => {
        if (opts.auditFailures) {
          this.prisma
            .unscoped()
            .auditLog.create({
              data: {
                tenantId: tenantId ?? null,
                actorType: userId ? 'user' : 'system',
                actorId: userId ?? null,
                action: `${opts.action}.failed`,
                targetType: opts.targetType ?? null,
                metadata: {
                  ip,
                  errorMessage: error?.message,
                  statusCode: error?.status ?? error?.response?.statusCode,
                } as Prisma.InputJsonValue,
              },
            })
            .catch((logErr) => this.logger.error('Failed to write failure audit log', logErr));
        }
        return throwError(() => error);
      }),
    );
  }

  private extractTargetId(result: unknown): string | null {
    if (!result || typeof result !== 'object') return null;
    const r = result as Record<string, unknown>;
    if (typeof r.id === 'string') return r.id;
    return null;
  }

  private buildMetadata(req: any, result: unknown): Record<string, unknown> {
    return {
      method: req.method,
      path: req.originalUrl ?? req.url,
      ip: req.ip,
      resultType: result && typeof result === 'object' ? 'object' : typeof result,
    };
  }
}
