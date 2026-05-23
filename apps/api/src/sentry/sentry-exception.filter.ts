import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';

/**
 * Global filter that reports unhandled (non-HttpException) exceptions to
 * Sentry. HttpException covers expected API errors (400/401/403/404 etc.)
 * and is intentionally not reported.
 *
 * The filter writes the HTTP response itself so expected errors still return
 * JSON. Re-throwing here would fall through to Express's HTML error handler.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string; user?: { sub?: string; tenantId?: string } }>();
    const res = ctx.getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      try {
        Sentry.withScope((scope) => {
          if (req?.user) scope.setUser({ id: req.user.sub, tenantId: req.user.tenantId });
          if (req?.id) scope.setTag('request_id', req.id);
          if (req?.url) scope.setExtra('url', req.url);
          Sentry.captureException(exception);
        });
      } catch (e) {
        this.logger.warn(`Sentry capture failed: ${(e as Error).message}`);
      }
    }

    if (res.headersSent) return;

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException
      ? normalizeHttpExceptionResponse(exception.getResponse(), status)
      : { statusCode: status, message: 'Internal server error' };

    res.status(status).json(body);
  }
}

function normalizeHttpExceptionResponse(response: string | object, statusCode: number) {
  if (typeof response === 'string') {
    return { statusCode, message: response };
  }
  return { statusCode, ...response };
}
