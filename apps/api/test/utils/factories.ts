import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface RegisteredTenant {
  tenantId: string;
  officeId: string;
  ownerId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;

export async function registerTenant(
  app: INestApplication,
  opts: Partial<{ tenantName: string; officeName: string; ownerName: string; email: string; password: string }> = {},
): Promise<RegisteredTenant> {
  const idx = ++counter;
  const body = {
    tenantName: opts.tenantName ?? `Tenant ${idx}`,
    officeName: opts.officeName ?? `Office ${idx}`,
    ownerName: opts.ownerName ?? `Owner ${idx}`,
    email: opts.email ?? `owner${idx}+${Date.now()}@test.co`,
    password: opts.password ?? 'TestPass1!',
  };
  const res = await request(app.getHttpServer()).post('/auth/register-tenant').send(body).expect(201);

  return {
    tenantId: res.body.user.tenantId,
    officeId: res.body.user.officeId,
    ownerId: res.body.user.id,
    email: body.email,
    accessToken: res.body.tokens.accessToken,
    refreshToken: res.body.tokens.refreshToken,
  };
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
