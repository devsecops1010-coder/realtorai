import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';
import { bearer, registerTenant } from './utils/factories';

/**
 * Catalog endpoints behave the same for every authenticated user — they're
 * platform-wide lookup tables, not tenant-scoped. These tests also exercise
 * the platform-admin write paths so the audit trail + role gate stay green.
 */
describe('Catalogs (areas + plans)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    // Seed a minimal catalog before each test — we want deterministic counts.
    await prisma.unscoped().areaCatalog.createMany({
      data: [
        { slug: 'tel-aviv-test', nameHe: 'תל אביב טסט', region: 'מרכז', sortOrder: 10 },
        { slug: 'haifa-test', nameHe: 'חיפה טסט', region: 'צפון', sortOrder: 20 },
        { slug: 'eilat-test', nameHe: 'אילת טסט', region: 'דרום', sortOrder: 30, active: false },
      ],
    });
    await prisma.unscoped().planCatalog.createMany({
      data: [
        { slug: 'starter-test', nameHe: 'סטארטר טסט', nameEn: 'Starter', monthlyPlanIls: 0 },
        { slug: 'pro-test', nameHe: 'פרו טסט', nameEn: 'Pro', monthlyPlanIls: 2490 },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /catalog/areas', () => {
    it('returns active areas only (default) for authenticated users', async () => {
      const t = await registerTenant(app);
      const res = await request(app.getHttpServer())
        .get('/catalog/areas')
        .set(bearer(t.accessToken))
        .expect(200);
      // 2 active out of 3 inserted.
      expect(res.body).toHaveLength(2);
      const slugs = (res.body as Array<{ slug: string }>).map((a) => a.slug);
      expect(slugs).toEqual(expect.arrayContaining(['tel-aviv-test', 'haifa-test']));
      expect(slugs).not.toContain('eilat-test');
    });

    it('orders by sortOrder ascending', async () => {
      const t = await registerTenant(app);
      const res = await request(app.getHttpServer())
        .get('/catalog/areas')
        .set(bearer(t.accessToken))
        .expect(200);
      expect(res.body[0].slug).toBe('tel-aviv-test');
      expect(res.body[1].slug).toBe('haifa-test');
    });

    it('requires auth', async () => {
      await request(app.getHttpServer()).get('/catalog/areas').expect(401);
    });
  });

  describe('GET /catalog/plans', () => {
    it('returns plans for authenticated users', async () => {
      const t = await registerTenant(app);
      const res = await request(app.getHttpServer())
        .get('/catalog/plans')
        .set(bearer(t.accessToken))
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].monthlyPlanIls).toBeDefined();
    });
  });

  describe('Admin catalog mutations', () => {
    it('rejects non-platform users on POST /admin/catalog/areas', async () => {
      const t = await registerTenant(app); // office_owner, not platform
      await request(app.getHttpServer())
        .post('/admin/catalog/areas')
        .set(bearer(t.accessToken))
        .send({ slug: 'new-area', nameHe: 'אזור חדש', region: 'מרכז' })
        .expect(403);
    });

    it('platform_owner can create a new area', async () => {
      // Mint a platform_owner directly in DB + sign a JWT for them. No
      // /auth/login round-trip = no rate-limit risk.
      const jwt = app.get(JwtService);
      const config = app.get(ConfigService);
      const tenant = await prisma.unscoped().tenant.create({
        data: { name: 'Platform', status: 'active' },
      });
      const user = await prisma.unscoped().user.create({
        data: {
          tenantId: tenant.id,
          name: 'P Owner',
          email: `pow+${Date.now()}-${Math.random()}@test.co`,
          role: 'platform_owner',
          status: 'active',
          passwordHash: 'unused',
        },
      });
      const adminToken = await jwt.signAsync(
        {
          sub: user.id,
          tenantId: tenant.id,
          officeId: null,
          role: 'platform_owner',
          type: 'access',
        },
        { secret: config.get<string>('JWT_SECRET'), expiresIn: '15m' },
      );

      const res = await request(app.getHttpServer())
        .post('/admin/catalog/areas')
        .set(bearer(adminToken))
        .send({ slug: 'New-Area', nameHe: 'אזור חדש לבדיקה', region: 'מרכז' })
        .expect(201);
      expect(res.body.slug).toBe('new-area'); // normalized
      expect(res.body.nameHe).toBe('אזור חדש לבדיקה');
    });
  });
});
