import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockLlmProvider } from '../src/llm/providers/mock.provider';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { bearer, registerTenant } from './utils/factories';

describe('Sprint 4: notifications + reports + scheduled followups (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let scheduler: SchedulerService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    scheduler = app.get(SchedulerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    MockLlmProvider.reset();
  });

  it('agent moving a lead to temperature=hot creates a hot_lead notification', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000010' },
    });

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'מעולה, אעדכן את המתווך',
        actions: [
          { tool: 'update_lead_fields', args: { fullName: 'אבי', city: 'תל אביב', budgetMin: 3000000 } },
          { tool: 'update_lead_status', args: { status: 'hot', temperature: 'hot' } },
        ],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972500111111',
        to: '+97250000010',
        body: 'מחפש לקנות דירה היום בתל אביב, יש לי 3 מיליון ש"ח, אני רוצה לראות נכסים מהר',
        messageId: 'm-1',
      })
      .expect(200);

    const notifs = await prisma.unscoped().notification.findMany({
      where: { tenantId: t.tenantId, type: 'hot_lead' },
    });
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].title).toContain('🔥');
    expect(notifs[0].userId).toBe(t.ownerId);
    expect(notifs[0].severity).toBe('alert');
  });

  it('GET /notifications returns the current users\' notifications', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().notification.create({
      data: {
        tenantId: t.tenantId,
        officeId: t.officeId,
        userId: t.ownerId,
        type: 'system',
        title: 'בדיקה',
        body: 'גוף ההודעה',
      },
    });

    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set(bearer(t.accessToken))
      .expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('בדיקה');
  });

  it('POST /notifications/:id/read marks as read', async () => {
    const t = await registerTenant(app);
    const n = await prisma.unscoped().notification.create({
      data: {
        tenantId: t.tenantId,
        userId: t.ownerId,
        type: 'system',
        title: 'X',
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/notifications/${n.id}/read`)
      .set(bearer(t.accessToken))
      .expect(200);
    expect(res.body.readAt).not.toBeNull();
  });

  it('GET /reports/today returns counts for the current tenant', async () => {
    const t = await registerTenant(app);
    await request(app.getHttpServer())
      .post('/leads').set(bearer(t.accessToken))
      .send({ fullName: 'L1', phone: '050-9990001', intent: 'buy' }).expect(201);

    const res = await request(app.getHttpServer())
      .get('/reports/today')
      .set(bearer(t.accessToken))
      .expect(200);
    expect(res.body.counts.totalLeads).toBe(1);
    expect(res.body.counts.newLeadsToday).toBe(1);
  });

  it('scheduler.processDueFollowups creates followup tasks and notifications', async () => {
    const t = await registerTenant(app);
    const lead = await prisma.unscoped().lead.create({
      data: {
        tenantId: t.tenantId,
        officeId: t.officeId,
        phone: '050-7777777',
        fullName: 'Followup Lead',
        intent: 'buy',
        nextFollowupAt: new Date(Date.now() - 60_000), // 1 minute past due
      },
    });

    await scheduler.processDueFollowups();

    const task = await prisma.unscoped().task.findFirst({
      where: { tenantId: t.tenantId, leadId: lead.id, type: 'followup' },
    });
    expect(task).not.toBeNull();
    expect(task!.status).toBe('open');
    expect(task!.createdByType).toBe('system');

    const notifs = await prisma.unscoped().notification.findMany({
      where: { tenantId: t.tenantId, type: 'followup_due' },
    });
    expect(notifs.length).toBeGreaterThan(0);

    // Lead's nextFollowupAt should be cleared.
    const refreshed = await prisma.unscoped().lead.findUnique({ where: { id: lead.id } });
    expect(refreshed!.nextFollowupAt).toBeNull();

    // Second run shouldn't create a duplicate task.
    await scheduler.processDueFollowups();
    const tasks = await prisma.unscoped().task.count({
      where: { tenantId: t.tenantId, leadId: lead.id, type: 'followup' },
    });
    expect(tasks).toBe(1);
  });
});
