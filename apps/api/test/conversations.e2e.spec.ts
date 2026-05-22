import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Conversations + Messages (e2e)', () => {
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

  async function makeLead(t: { accessToken: string }) {
    const res = await request(app.getHttpServer())
      .post('/leads')
      .set(bearer(t.accessToken))
      .send({ fullName: 'L', phone: '0501111111', intent: 'buy' })
      .expect(201);
    return res.body;
  }

  it('POST /conversations + POST /conversations/:id/messages + GET /conversations/:id', async () => {
    const t = await registerTenant(app);
    const lead = await makeLead(t);

    const conv = await request(app.getHttpServer())
      .post('/conversations')
      .set(bearer(t.accessToken))
      .send({ leadId: lead.id, channel: 'manual' })
      .expect(201);
    expect(conv.body.tenantId).toBe(t.tenantId);
    expect(conv.body.channel).toBe('manual');

    await request(app.getHttpServer())
      .post(`/conversations/${conv.body.id}/messages`)
      .set(bearer(t.accessToken))
      .send({ body: 'שלום, פנינו אליך לאחרונה' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/conversations/${conv.body.id}/messages`)
      .set(bearer(t.accessToken))
      .send({ body: 'מענה לאחר 5 דקות', senderType: 'lead' })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/conversations/${conv.body.id}`)
      .set(bearer(t.accessToken))
      .expect(200);
    expect(detail.body.messages.length).toBe(2);
    expect(detail.body.messages[0].body).toContain('שלום');
    expect(detail.body.messages[1].senderType).toBe('lead');
  });

  it('POST /conversations/:id/handoff marks handoffRequired + status=handoff', async () => {
    const t = await registerTenant(app);
    const lead = await makeLead(t);
    const conv = await request(app.getHttpServer())
      .post('/conversations')
      .set(bearer(t.accessToken))
      .send({ leadId: lead.id, channel: 'whatsapp' })
      .expect(201);

    const after = await request(app.getHttpServer())
      .post(`/conversations/${conv.body.id}/handoff`)
      .set(bearer(t.accessToken))
      .send({ reason: 'customer asked for human' })
      .expect(201);

    expect(after.body.handoffRequired).toBe(true);
    expect(after.body.status).toBe('handoff');
    expect((after.body.metadata as any).handoffReason).toBe('customer asked for human');
  });

  it('cross-tenant access to a conversation is 404', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);
    const leadA = await makeLead(a);
    const conv = await request(app.getHttpServer())
      .post('/conversations')
      .set(bearer(a.accessToken))
      .send({ leadId: leadA.id, channel: 'manual' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/conversations/${conv.body.id}`)
      .set(bearer(b.accessToken))
      .expect(404);
  });
});
