import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import type { Env } from '../config/env.schema';

@Injectable()
export class SentryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onApplicationBootstrap() {
    const dsn = this.config.get('SENTRY_DSN', { infer: true });
    if (!dsn) {
      this.logger.log('SENTRY_DSN not set — Sentry disabled');
      return;
    }
    const env = this.config.get('SENTRY_ENVIRONMENT', { infer: true }) ??
      this.config.get('NODE_ENV', { infer: true });

    // Release version: prefer SENTRY_RELEASE (set by CI), then a generic
     // RELEASE / GIT_SHA, then fall back to the package version. Untagged
     // releases are still better than 'unknown' for grouping errors.
    const release =
      process.env.SENTRY_RELEASE ??
      process.env.RELEASE ??
      process.env.GIT_SHA ??
      `realtorai@${process.env.npm_package_version ?? 'dev'}`;

    Sentry.init({
      dsn,
      environment: env,
      release,
      tracesSampleRate: env === 'production' ? 0.1 : 1.0,
      // Strip common PII before sending
      beforeSend(event) {
        const scrubKey = (obj: Record<string, unknown> | undefined) => {
          if (!obj) return;
          for (const k of ['password', 'refreshToken', 'accessToken', 'authorization', 'cookie']) {
            if (k in obj) obj[k] = '[redacted]';
          }
        };
        scrubKey(event.request?.headers as Record<string, unknown> | undefined);
        scrubKey(event.request?.cookies as Record<string, unknown> | undefined);
        if (event.request?.data && typeof event.request.data === 'object') {
          scrubKey(event.request.data as Record<string, unknown>);
        }
        return event;
      },
    });

    this.initialized = true;
    this.logger.log(`Sentry initialized: environment=${env} release=${release}`);
  }

  captureException(error: unknown, hint?: Record<string, unknown>) {
    if (!this.initialized) return;
    Sentry.captureException(error, hint as Sentry.EventHint | undefined);
  }

  flush(timeoutMs = 2000) {
    if (!this.initialized) return Promise.resolve(true);
    return Sentry.flush(timeoutMs);
  }
}
