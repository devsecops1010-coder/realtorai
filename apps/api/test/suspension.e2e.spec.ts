import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';
import { bearer, registerTenant } from './utils/factories';

/**
 * TenantStatusGuard end-to-end. We avoid hammering /auth/login (rate-limited
 * to 5/min) by minting a platform_owner row directly in the DB and reusing
 * the same access token across the whole suite.
 */
describe('Tenant suspension enforcement', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;
  let adminToken: string;
  let adminTenantId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    jwt = app.get(JwtService);
    config = app.get(ConfigService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    // Build a platform_owner directly in DB + mint a JWT for them via
    // JwtService. Avoids the /auth/login rate limit (5/min) so we can run
    // every test in the suite quickly without flakes.
    const tenant = await prisma.unscoped().tenant.create({
      data: { name: 'Platform Tenant', status: 'active' },
    });
    const user = await prisma.unscoped().user.create({
      data: {
        tenantId: tenant.id,
        name: 'Platform Owner',
        email: `pow+${Date.now()}-${Math.random()}@test.co`,
        role: 'platform_owner',
        status: 'active',
        passwordHash: 'unused-in-this-flow',
      },
    });
    adminTenantId = tenant.id;
    adminToken = await jwt.signAsync(
      {
        sub: user.id,
        tenantId: tenant.id,
        officeId: null,
        role: 'platform_owner',
        type: 'access',
      },
      {
        secret: config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks non-platform users with 451 when their tenant is suspended', async () => {
    const target = await registerTenant(app);

    await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/suspend`)
      .set(bearer(adminToken))
      .send({ reason: 'test suspension', notifyOwner: false })
      .expect(200);

    const blocked = await request(app.getHttpServer())
      .get('/leads')
      .set(bearer(target.accessToken))
      .expect(451);
    expect(blocked.body.code).toBe('tenant_suspended');
    expect(blocked.body.reason).toBe('test suspension');
  });

  it('allows /auth/me even when suspended (so the UI can show the suspended screen)', async () => {
    const target = await registerTenant(app);

    await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/suspend`)
      .set(bearer(adminToken))
      .send({ reason: 'test', notifyOwner: false })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set(bearer(target.accessToken))
      .expect(200);
    // /auth/me returns the AuthenticatedUser shape directly (not wrapped).
    expect(me.body.email).toBe(target.email);
  });

  it('platform_owner bypasses the guard even if their own tenant is suspended', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/tenants/${adminTenantId}/suspend`)
      .set(bearer(adminToken))
      .send({ reason: 'self suspend', notifyOwner: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/admin/tenants')
      .set(bearer(adminToken))
      .expect(200);
  });

  it('reactivate restores access', async () => {
    const target = await registerTenant(app);

    await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/suspend`)
      .set(bearer(adminToken))
      .send({ reason: 'test', notifyOwner: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/leads')
      .set(bearer(target.accessToken))
      .expect(451);

    await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/reactivate`)
      .set(bearer(adminToken))
      .send({ notifyOwner: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/leads')
      .set(bearer(target.accessToken))
      .expect(200);
  });

  it('writes an audit log on suspend + reactivate', async () => {
    const target = await registerTenant(app);

    await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/suspend`)
      .set(bearer(adminToken))
      .send({ reason: 'audit test', notifyOwner: false })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/reactivate`)
      .set(bearer(adminToken))
      .send({ notifyOwner: false })
      .expect(200);

    const logs = await prisma.unscoped().auditLog.findMany({
      where: { targetType: 'tenant', targetId: target.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    const actions = logs.map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['tenant.suspended', 'tenant.reactivated']));
  });

  it('setPlan applies catalog defaults and writes audit', async () => {
    await prisma.unscoped().planCatalog.create({
      data: {
        slug: 'pro-suspension-test',
        nameHe: 'פרו טסט',
        monthlyPlanIls: 999,
        includedMessages: 5000,
      },
    });

    const target = await registerTenant(app);

    const res = await request(app.getHttpServer())
      .patch(`/admin/tenants/${target.tenantId}/plan`)
      .set(bearer(adminToken))
      .send({ planSlug: 'pro-suspension-test' })
      .expect(200);

    expect(res.body.plan).toBe('pro-suspension-test');
    expect(res.body.monthlyPlanIls).toBe(999);

    const logs = await prisma.unscoped().auditLog.findMany({
      where: { targetType: 'tenant', targetId: target.tenantId, action: 'tenant.plan_changed' },
    });
    expect(logs).toHaveLength(1);
  });
});
