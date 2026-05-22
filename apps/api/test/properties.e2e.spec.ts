import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockLlmProvider } from '../src/llm/providers/mock.provider';
import { bearer, registerTenant } from './utils/factories';

describe('Properties + Property Recruiter (e2e)', () => {
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
    MockLlmProvider.reset();
  });

  it('POST /properties creates a property in the caller tenant', async () => {
    const t = await registerTenant(app);

    const res = await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(t.accessToken))
      .send({ dealType: 'sale', city: 'תל אביב', area: 'צפון', rooms: 4, price: 3500000 })
      .expect(201);

    expect(res.body.tenantId).toBe(t.tenantId);
    expect(res.body.dealType).toBe('sale');
    expect(res.body.status).toBe('draft');
  });

  it('bulk-upload-owners creates leads + properties; idempotent on same phone', async () => {
    const t = await registerTenant(app);

    const owners = [
      { ownerName: 'אבי', ownerPhone: '0501112233', dealType: 'sale', city: 'הרצליה', rooms: 4 },
      { ownerName: 'רותי', ownerPhone: '0501112244', dealType: 'rent', city: 'תל אביב' },
    ];

    const res = await request(app.getHttpServer())
      .post('/properties/bulk-upload-owners')
      .set(bearer(t.accessToken))
      .send({ owners })
      .expect(201);

    expect(res.body.count).toBe(2);
    const leads = await prisma.unscoped().lead.findMany({ where: { tenantId: t.tenantId } });
    expect(leads.length).toBe(2);
    const properties = await prisma.unscoped().property.findMany({ where: { tenantId: t.tenantId } });
    expect(properties.length).toBe(2);
    expect(properties.find((p) => p.dealType === 'sale')!.rooms?.toString()).toBe('4');

    // Re-upload the same phones should NOT duplicate leads (find-or-create).
    await request(app.getHttpServer())
      .post('/properties/bulk-upload-owners')
      .set(bearer(t.accessToken))
      .send({ owners })
      .expect(201);

    const leadsAfter = await prisma.unscoped().lead.count({ where: { tenantId: t.tenantId } });
    expect(leadsAfter).toBe(2);
    const propsAfter = await prisma.unscoped().property.count({ where: { tenantId: t.tenantId } });
    expect(propsAfter).toBe(4); // each upload creates a new property even if lead exists
  });

  it('GET /properties of another tenant is invisible', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(b.accessToken))
      .send({ dealType: 'rent' })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get('/properties')
      .set(bearer(a.accessToken))
      .expect(200);
    expect(listA.body.length).toBe(0);
  });

  it('owner lead message routes to property_recruiter agent and creates a Property via tool', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000005' },
    });

    // Pre-create an owner lead so the orchestrator sees intent=sell.
    const ownerLead = await prisma.unscoped().lead.create({
      data: {
        tenantId: t.tenantId,
        officeId: t.officeId,
        fullName: 'מוכר אבי',
        phone: '+972500999888',
        intent: 'sell',
        status: 'new',
        temperature: 'cold',
        source: 'owner_upload',
      },
    });

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'תודה אבי. אגייס פרטים — כמה חדרים בנכס?',
        actions: [
          {
            tool: 'create_property',
            args: { dealType: 'sale', city: 'הרצליה', rooms: 4, price: 4200000 },
          },
        ],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972500999888',
        to: '+97250000005',
        body: 'שלום, מוכן למכור את הדירה שלי, איך נתקדם?',
        messageId: 'wamid.recruit-1',
      })
      .expect(200);

    // A property should be created linked to the owner lead.
    const properties = await prisma.unscoped().property.findMany({
      where: { tenantId: t.tenantId, ownerLeadId: ownerLead.id },
    });
    expect(properties.length).toBe(1);
    expect(properties[0].dealType).toBe('sale');
    expect(properties[0].rooms?.toString()).toBe('4');
    expect(properties[0].price).toBe(4200000);

    // The agent created should be of type property_recruiter.
    const agent = await prisma.unscoped().agent.findFirst({
      where: { tenantId: t.tenantId, type: 'property_recruiter' },
    });
    expect(agent).not.toBeNull();
  });
});
