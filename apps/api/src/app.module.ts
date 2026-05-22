import { Module } from '@nestjs/common';
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
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

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
    AgentsModule,
    WebhooksModule,
    ReportsModule,
    SchedulerModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
