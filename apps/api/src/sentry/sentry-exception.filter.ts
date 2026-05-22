import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/**
 * Global filter that reports unhandled (non-HttpException) exceptions to
 * Sentry. HttpException covers expected API errors (400/401/403/404 etc.)
 * and is intentionally not reported.
 *
 * We re-throw so NestJS's default handler still produces the response.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) {
      const req = host.switchToHttp().getRequest();
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
    // Re-throw to let Nest's default exception filter produce the response
    throw exception;
  }
}
