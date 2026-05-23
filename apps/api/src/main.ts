import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Env, true>);
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const port = config.get('PORT', { infer: true });
  const host = config.get('HOST', { infer: true });
  const corsOriginsRaw = config.get('CORS_ORIGINS', { infer: true });
  const corsOrigins = corsOriginsRaw
    ? corsOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : nodeEnv !== 'production',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: false as never });
  app.enableShutdownHooks();

  await app.listen(port, host);
  const logger = app.get(Logger);
  logger.log(`Realtorai API listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {

  console.error('Fatal during bootstrap:', err);
  process.exit(1);
});
