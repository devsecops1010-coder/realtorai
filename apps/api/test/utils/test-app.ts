import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService) {
  // Truncate in FK-safe order via CASCADE. CASCADE handles cross-table
  // dependencies (e.g. office_areas references both offices and area_catalog)
  // so the order between tables is mostly a convenience.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE ' +
      '"mortgage_referrals", "mortgage_profiles", "mortgage_advisors", ' +
      '"notifications", "usage_events", ' +
      '"messages", "tasks", "conversations", "agent_configs", "agents", ' +
      '"leads", "refresh_tokens", "audit_logs", "opt_outs", "users", ' +
      '"office_areas", "offices", "area_catalog", "plan_catalog", "tenants" ' +
      'RESTART IDENTITY CASCADE',
  );
}
