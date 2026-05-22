import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryService } from './sentry.service';
import { SentryExceptionFilter } from './sentry-exception.filter';

@Global()
@Module({
  providers: [
    SentryService,
    { provide: APP_FILTER, useClass: SentryExceptionFilter },
  ],
  exports: [SentryService],
})
export class SentryModule {}
