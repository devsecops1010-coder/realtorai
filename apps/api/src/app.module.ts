import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import { validateEnv, type Env } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { OfficesModule } from './offices/offices.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TasksModule } from './tasks/tasks.module';
import { PropertiesModule } from './properties/properties.module';
import { LlmModule } from './llm/llm.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { AgentsModule } from './agents/agents.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from './queues/queue.module';
import { SentryModule } from './sentry/sentry.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AdminModule } from './admin/admin.module';
import { ExportsModule } from './exports/exports.module';
import { MarketingModule } from './marketing/marketing.module';
import { MortgageModule } from './mortgage/mortgage.module';
import { GrowthModule } from './growth/growth.module';
import { AuditModule } from './audit/audit.module';
import { OrgModule } from './org/org.module';
import { SignModule } from './sign/sign.module';
import { CatalogModule } from './catalog/catalog.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantStatusGuard } from './common/guards/tenant-status.guard';
import { PermissionsService } from './common/permissions/permissions.service';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CookieParserMiddleware } from './common/middleware/cookie-parser.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.refreshToken',
              'res.headers["set-cookie"]',
            ],
            censor: '[redacted]',
          },
          genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
          customLogLevel: (_req, res, err) => {
            if (err) return 'error';
            if (res.statusCode >= 500) return 'error';
            if (res.statusCode >= 400) return 'warn';
            return 'info';
          },
          // Enrich every log line with the authenticated user's context.
          // Pulled directly from req.user (set by JwtStrategy) so it appears
          // even on logs emitted outside of NestJS's request lifecycle.
          customProps: (req) => {
            const u = (req as unknown as { user?: { sub?: string; tenantId?: string; officeId?: string; role?: string } }).user;
            if (!u) return {};
            return {
              tenantId: u.tenantId,
              userId: u.sub,
              officeId: u.officeId,
              role: u.role,
            };
          },
        },
      }),
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('AUTH_THROTTLE_TTL_MS', { infer: true }),
          limit: config.get('AUTH_THROTTLE_LIMIT', { infer: true }) * 20, // global default
        },
      ],
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    TenantsModule,
    OfficesModule,
    UsersModule,
    LeadsModule,
    ConversationsModule,
    TasksModule,
    PropertiesModule,
    LlmModule,
    WhatsAppModule,
    NotificationsModule,
    BillingModule,
    AgentsModule,
    QueueModule,
    WebhooksModule,
    SentryModule,
    ReportsModule,
    SchedulerModule,
    OnboardingModule,
    AdminModule,
    ExportsModule,
    MarketingModule,
    MortgageModule,
    GrowthModule,
    AuditModule,
    OrgModule,
    SignModule,
    CatalogModule,
    HealthModule,
  ],
  providers: [
    PermissionsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // TenantStatusGuard runs between auth + role checks. Order in Nest is the
    // order providers are listed here.
    { provide: APP_GUARD, useClass: TenantStatusGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply cookie-parser to every request so JwtStrategy + AuthController
    // can read/write the rai_access / rai_refresh httpOnly cookies.
    consumer.apply(CookieParserMiddleware).forRoutes('*');
    // CSRF runs after cookie-parser (Express applies middleware in
    // registration order) so it can read req.cookies.
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
