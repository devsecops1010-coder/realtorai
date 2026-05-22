import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockLlmProvider } from '../src/llm/providers/mock.provider';
import { bearer, registerTenant } from './utils/factories';

describe('Mortgage module (e2e)', () => {
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

  it('POST /mortgage/advisors creates an advisor; list returns it', async () => {
    const t = await registerTenant(app);
    const res = await request(app.getHttpServer())
      .post('/mortgage/advisors')
      .set(bearer(t.accessToken))
      .send({ fullName: 'יועץ אבי', company: 'משכנתאות חכמות', phone: '0509999999', email: 'avi@m.co.il' })
      .expect(201);

    expect(res.body.tenantId).toBe(t.tenantId);
    expect(res.body.status).toBe('active');

    const list = await request(app.getHttpServer())
      .get('/mortgage/advisors')
      .set(bearer(t.accessToken))
      .expect(200);
    expect(list.body.length).toBe(1);
  });

  it('advisors are not visible across tenants', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);
    await request(app.getHttpServer())
      .post('/mortgage/advisors')
      .set(bearer(a.accessToken))
      .send({ fullName: 'יועץ של A', email: 'aa@m.co.il' })
      .expect(201);
    const listB = await request(app.getHttpServer())
      .get('/mortgage/advisors')
      .set(bearer(b.accessToken))
      .expect(200);
    expect(listB.body.length).toBe(0);
  });

  it('consent must be recorded before /refer; refer returns 403 without consent', async () => {
    const t = await registerTenant(app);
    const lead = (
      await request(app.getHttpServer())
        .post('/leads').set(bearer(t.accessToken))
        .send({ fullName: 'דני', phone: '0501111111', intent: 'buy' })
        .expect(201)
    ).body;
    const profile = (
      await request(app.getHttpServer())
        .post(`/mortgage/profiles/by-lead/${lead.id}`).set(bearer(t.accessToken)).expect(200)
    ).body;
    const advisor = (
      await request(app.getHttpServer())
        .post('/mortgage/advisors').set(bearer(t.accessToken))
        .send({ fullName: 'יועץ', email: 'y@m.co.il' }).expect(201)
    ).body;

    await request(app.getHttpServer())
      .post(`/mortgage/profiles/${profile.id}/refer`)
      .set(bearer(t.accessToken))
      .send({ advisorId: advisor.id })
      .expect(403);

    // record consent then refer succeeds
    await request(app.getHttpServer())
      .post(`/mortgage/profiles/${profile.id}/consent`)
      .set(bearer(t.accessToken))
      .send({
        consentToShareWithAdvisor: true,
        consentText: 'הלקוח אישר העברת שם, טלפון ופרטים כלליים ליועץ',
      })
      .expect(200);

    const refRes = await request(app.getHttpServer())
      .post(`/mortgage/profiles/${profile.id}/refer`)
      .set(bearer(t.accessToken))
      .send({ advisorId: advisor.id })
      .expect(201);
    expect(refRes.body.status).toBe('pending');

    // Referral notification was created
    const notifs = await prisma.unscoped().notification.findMany({
      where: { tenantId: t.tenantId, type: 'mortgage_referred' },
    });
    expect(notifs.length).toBeGreaterThan(0);
  });

  it('pre-approval flag triggers mortgage_pre_approved notification', async () => {
    const t = await registerTenant(app);
    const lead = (
      await request(app.getHttpServer())
        .post('/leads').set(bearer(t.accessToken))
        .send({ fullName: 'דני', phone: '0502222222', intent: 'buy' })
        .expect(201)
    ).body;
    const profile = (
      await request(app.getHttpServer())
        .post(`/mortgage/profiles/by-lead/${lead.id}`).set(bearer(t.accessToken)).expect(200)
    ).body;

    await request(app.getHttpServer())
      .patch(`/mortgage/profiles/${profile.id}`)
      .set(bearer(t.accessToken))
      .send({ hasPreApproval: true, preApprovalAmount: 2_000_000, preApprovalBank: 'הפועלים' })
      .expect(200);

    const notifs = await prisma.unscoped().notification.findMany({
      where: { tenantId: t.tenantId, type: 'mortgage_pre_approved' },
    });
    expect(notifs.length).toBeGreaterThan(0);
  });

  it('readiness score reflects inputs', async () => {
    const t = await registerTenant(app);
    const lead = (
      await request(app.getHttpServer())
        .post('/leads').set(bearer(t.accessToken))
        .send({ fullName: 'דני', phone: '0503333333', intent: 'buy' })
        .expect(201)
    ).body;
    const profile = (
      await request(app.getHttpServer())
        .post(`/mortgage/profiles/by-lead/${lead.id}`).set(bearer(t.accessToken)).expect(200)
    ).body;

    // No fields → unknown
    const empty = await request(app.getHttpServer())
      .get(`/mortgage/profiles/${profile.id}`).set(bearer(t.accessToken)).expect(200);
    expect(empty.body.readiness).toBe('unknown');

    // Strong inputs without pre-approval → ready
    await request(app.getHttpServer())
      .patch(`/mortgage/profiles/${profile.id}`).set(bearer(t.accessToken))
      .send({ estimatedPrice: 2_000_000, estimatedEquity: 600_000, monthlyIncome: 25_000 })
      .expect(200);
    const after = await request(app.getHttpServer())
      .get(`/mortgage/profiles/${profile.id}`).set(bearer(t.accessToken)).expect(200);
    expect(['ready', 'partial']).toContain(after.body.readiness);
    expect(after.body.readinessScore).toBeGreaterThanOrEqual(30);
  });

  it('agent webhook flow: lead responder collects mortgage info via tools then refers', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId }, data: { whatsappNumber: '+97250000099' },
    });
    const advisor = await prisma.unscoped().mortgageAdvisor.create({
      data: { tenantId: t.tenantId, fullName: 'יועץ AI', email: 'aiadv@m.co.il' },
    });

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'תודה. אצור איתך קשר ביועץ משכנתאות מומלץ.',
        actions: [
          { tool: 'update_lead_fields', args: { fullName: 'אבי', intent: 'buy', city: 'תל אביב' } },
          {
            tool: 'collect_mortgage_info',
            args: { estimatedPrice: 2_500_000, estimatedEquity: 700_000, monthlyIncome: 22_000, hasPreApproval: false },
          },
          {
            tool: 'record_mortgage_consent',
            args: {
              consent: true,
              consentText: 'הלקוח אישר העברת שם, טלפון, תקציב והון עצמי משוער ליועץ משכנתאות',
            },
          },
          { tool: 'refer_to_mortgage_advisor', args: { advisorId: advisor.id } },
        ],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972504444444',
        to: '+97250000099',
        body: 'אני אבי, מחפש דירה בתל אביב, צריך עזרה גם עם משכנתא',
        messageId: 'mort-1',
      })
      .expect(200);

    const profile = await prisma.unscoped().mortgageProfile.findFirst({
      where: { tenantId: t.tenantId },
    });
    expect(profile).not.toBeNull();
    expect(profile!.estimatedPrice).toBe(2_500_000);
    expect(profile!.estimatedEquity).toBe(700_000);
    expect(profile!.consentToShareWithAdvisor).toBe(true);
    expect(profile!.status).toBe('referred');

    const referrals = await prisma.unscoped().mortgageReferral.findMany({
      where: { tenantId: t.tenantId, advisorId: advisor.id },
    });
    expect(referrals.length).toBe(1);
  });

  it('refer_to_mortgage_advisor tool fails without consent', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId }, data: { whatsappNumber: '+97250000098' },
    });
    const advisor = await prisma.unscoped().mortgageAdvisor.create({
      data: { tenantId: t.tenantId, fullName: 'יועץ', email: 'no-consent@m.co.il' },
    });

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'בסדר.',
        actions: [
          { tool: 'collect_mortgage_info', args: { estimatedPrice: 1_500_000 } },
          { tool: 'refer_to_mortgage_advisor', args: { advisorId: advisor.id } },
        ],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972505555555',
        to: '+97250000098',
        body: 'מחפש דירה',
        messageId: 'mort-2',
      })
      .expect(200);

    // Referral should NOT have been created
    const refs = await prisma.unscoped().mortgageReferral.findMany({
      where: { tenantId: t.tenantId },
    });
    expect(refs.length).toBe(0);

    // Profile exists but status not 'referred'
    const profile = await prisma.unscoped().mortgageProfile.findFirst({
      where: { tenantId: t.tenantId },
    });
    expect(profile).not.toBeNull();
    expect(profile!.status).not.toBe('referred');
  });
});
