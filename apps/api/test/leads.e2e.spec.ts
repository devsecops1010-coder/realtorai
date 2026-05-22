import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Leads (e2e)', () => {
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

  it('POST /leads creates a lead in the caller tenant', async () => {
    const t = await registerTenant(app);
    const res = await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(t.accessToken))
      .send({
        fullName: 'Avi Cohen',
        phone: '0501234567',
        intent: 'buy',
        city: 'Tel Aviv',
        budgetMin: 1_500_000,
        budgetMax: 2_500_000,
        rooms: 3,
      })
      .expect(201);

    expect(res.body.tenantId).toBe(t.tenantId);
    expect(res.body.officeId).toBe(t.officeId);
    expect(res.body.status).toBe('new');
    expect(res.body.temperature).toBe('cold');
  });

  it('GET /leads only returns leads in the caller tenant', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(a.accessToken))
      .send({ fullName: 'A1', phone: '050-111-1111', intent: 'buy' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(b.accessToken))
      .send({ fullName: 'B1', phone: '050-222-2222', intent: 'sell' })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get('/leads')
      .set(bearer(a.accessToken))
      .expect(200);
    expect(listA.body.items.length).toBe(1);
    expect(listA.body.items[0].fullName).toBe('A1');
  });

  it('PATCH /leads/:id of another tenant returns 404', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    const lead = await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(b.accessToken))
      .send({ fullName: 'BLead', phone: '050-3333333', intent: 'buy' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/leads/${lead.body.id}`)
      .set(bearer(a.accessToken))
      .send({ status: 'hot' })
      .expect(404);
  });

  it('POST /leads/:id/assign respects tenant boundary on assignee', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    const lead = await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(a.accessToken))
      .send({ fullName: 'X', phone: '0509999999', intent: 'buy' })
      .expect(201);

    // tenant A cannot assign tenant B's owner — assignee not found in their tenant
    await request(app.getHttpServer())
      .post(`/leads/${lead.body.id}/assign`)
      .set(bearer(a.accessToken))
      .send({ userId: b.ownerId })
      .expect(404);

    // tenant A can assign their own owner
    await request(app.getHttpServer())
      .post(`/leads/${lead.body.id}/assign`)
      .set(bearer(a.accessToken))
      .send({ userId: a.ownerId })
      .expect(200);
  });

  it('POST /leads/:id/opt-out marks lead opted_out and creates OptOut record', async () => {
    const t = await registerTenant(app);
    const lead = await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(t.accessToken))
      .send({ fullName: 'Optout', phone: '050-9999', intent: 'buy' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.body.id}/opt-out`)
      .set(bearer(t.accessToken))
      .send({ channel: 'whatsapp', reason: 'not interested' })
      .expect(200);
    expect(res.body.status).toBe('opted_out');

    const ooCount = await prisma.optOut.count({
      where: { tenantId: t.tenantId, phone: '050-9999', channel: 'whatsapp' },
    });
    expect(ooCount).toBe(1);
  });

  it('list filters by status work', async () => {
    const t = await registerTenant(app);
    await request(app.getHttpServer())
      .post('/leads').set(bearer(t.accessToken))
      .send({ fullName: 'A', phone: '050-1111111', intent: 'buy' }).expect(201);
    const hot = await request(app.getHttpServer())
      .post('/leads').set(bearer(t.accessToken))
      .send({ fullName: 'B', phone: '050-2222222', intent: 'buy' }).expect(201);
    await request(app.getHttpServer())
      .patch(`/leads/${hot.body.id}`).set(bearer(t.accessToken))
      .send({ status: 'hot', temperature: 'hot' }).expect(200);

    const res = await request(app.getHttpServer())
      .get('/leads?status=hot').set(bearer(t.accessToken)).expect(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].fullName).toBe('B');
  });
});
