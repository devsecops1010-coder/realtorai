import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Sprint 6: onboarding + admin + exports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('POST /onboarding creates tenant + office + owner + 2 agents + 2 active configs', async () => {
    const email = `o-${Date.now()}@test.co`;
    const res = await request(app.getHttpServer())
      .post('/onboarding')
      .send({
        tenantName: 'אגף נדלן',
        officeName: 'סניף הרצליה',
        ownerName: 'דני בעלים',
        email,
        password: 'TestPass1!',
        city: 'הרצליה',
        areas: ['צפון ישן', 'מרכז'],
      })
      .expect(201);

    expect(res.body.tenant.id).toBeDefined();
    expect(res.body.office.areas).toEqual(['צפון ישן', 'מרכז']);
    expect(res.body.agents.length).toBe(2);

    const agents = await prisma.unscoped().agent.findMany({
      where: { tenantId: res.body.tenant.id },
    });
    expect(agents.map((a) => a.type).sort()).toEqual(['lead_responder', 'property_recruiter']);

    const configs = await prisma.unscoped().agentConfig.findMany({
      where: { tenantId: res.body.tenant.id, isActive: true },
    });
    expect(configs.length).toBe(2);
  });

  it('admin endpoints reject non-platform_admin (403)', async () => {
    const t = await registerTenant(app);
    await request(app.getHttpServer())
      .get('/admin/usage')
      .set(bearer(t.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/revenue')
      .set(bearer(t.accessToken))
      .expect(403);
  });

  it('admin endpoints allow platform_admin', async () => {
    const t = await registerTenant(app);
    // Promote the owner to platform_admin for the test (admin endpoints don't depend on tenant scope).
    await prisma.unscoped().user.update({
      where: { id: t.ownerId },
      data: { role: 'platform_admin' },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: t.email, password: 'TestPass1!' })
      .expect(200);
    const adminToken: string = login.body.tokens.accessToken;

    const usage = await request(app.getHttpServer())
      .get('/admin/usage')
      .set(bearer(adminToken))
      .expect(200);
    expect(Array.isArray(usage.body)).toBe(true);

    const rev = await request(app.getHttpServer())
      .get('/admin/revenue')
      .set(bearer(adminToken))
      .expect(200);
    expect(typeof rev.body.mrr).toBe('number');

    const health = await request(app.getHttpServer())
      .get('/admin/health')
      .set(bearer(adminToken))
      .expect(200);
    expect(typeof health.body.tenants).toBe('number');
  });

  it('GET /exports/leads.csv returns CSV with BOM and headers', async () => {
    const t = await registerTenant(app);
    await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(t.accessToken))
      .send({ fullName: 'CSV Lead', phone: '0500000000', intent: 'buy' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/exports/leads.csv')
      .set(bearer(t.accessToken))
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const text = (res.body as Buffer).toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff); // BOM
    const stripped = text.replace(/^﻿/, '');
    const lines = stripped.split('\n');
    expect(lines[0]).toContain('fullName');
    expect(lines[1]).toContain('CSV Lead');
  });
});
