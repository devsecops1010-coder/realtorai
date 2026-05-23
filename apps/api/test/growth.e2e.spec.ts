import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Growth platform (e2e)', () => {
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

  it('requires auth for growth overview', async () => {
    await request(app.getHttpServer()).get('/growth/overview').expect(401);
  });

  it('returns growth overview and property launch plan for the caller tenant', async () => {
    const t = await registerTenant(app);

    const property = await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(t.accessToken))
      .send({
        dealType: 'sale',
        city: 'תל אביב',
        area: 'לב העיר',
        street: 'דיזנגוף',
        rooms: 3,
        price: 3200000,
        notes: 'דירה משופצת ליד תחבורה ציבורית',
      })
      .expect(201);

    const overview = await request(app.getHttpServer())
      .get('/growth/overview')
      .set(bearer(t.accessToken))
      .expect(200);

    expect(overview.body.stats.properties).toBe(1);
    expect(overview.body.integrations.length).toBeGreaterThanOrEqual(5);
    expect(overview.body.recentProperties[0].id).toBe(property.body.id);

    const plan = await request(app.getHttpServer())
      .get(`/growth/properties/${property.body.id}/launch-plan`)
      .set(bearer(t.accessToken))
      .expect(200);

    expect(plan.body.property.id).toBe(property.body.id);
    expect(plan.body.landingPage.sections).toContain('טופס ליד');
    expect(plan.body.socialQueue.length).toBeGreaterThanOrEqual(4);
    expect(plan.body.contractFlow.requiredFields).toContain('כתובת הנכס');
    expect(plan.body.invoiceFlow.providerMode).toBe('external_invoice_provider');
  });

  it('does not expose another tenant property launch plan', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    const property = await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(b.accessToken))
      .send({ dealType: 'rent', city: 'רמת גן' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/growth/properties/${property.body.id}/launch-plan`)
      .set(bearer(a.accessToken))
      .expect(404);
  });
});

