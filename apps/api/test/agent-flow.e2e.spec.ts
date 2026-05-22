import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockLlmProvider } from '../src/llm/providers/mock.provider';
import { MockWhatsAppProvider } from '../src/whatsapp/providers/mock.provider';
import { bearer, registerTenant } from './utils/factories';

describe('Agent flow: webhook → LLM → tools → reply (e2e)', () => {
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
    MockWhatsAppProvider.sent = [];
  });

  it('incoming WhatsApp → mock LLM JSON → tool calls run → reply sent → usage logged', async () => {
    const t = await registerTenant(app);

    // Set office's whatsappNumber so the orchestrator can route by the "to" field.
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000001' },
    });

    // Scripted LLM response: extract fields + reply.
    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'תודה דני, אבדוק עבורך דירות 3 חדרים בהרצליה בטווח 2-2.5 מיליון ש"ח.',
        actions: [
          {
            tool: 'update_lead_fields',
            args: { fullName: 'דני', city: 'הרצליה', rooms: 3, budgetMin: 2000000, budgetMax: 2500000, intent: 'buy' },
          },
          { tool: 'update_lead_status', args: { status: 'qualified', temperature: 'warm' } },
        ],
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972500011111',
        to: '+97250000001',
        body: 'שלום, אני דני. מחפש דירת 3 חדרים בהרצליה בתקציב 2-2.5 מיליון',
        messageId: 'wamid.mock-1',
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.processed).toBe(1);
    expect(res.body.results[0].replied).toBe(true);

    // Lead created
    const lead = await prisma.unscoped().lead.findFirst({
      where: { tenantId: t.tenantId, phone: '+972500011111' },
    });
    expect(lead).not.toBeNull();
    expect(lead!.fullName).toBe('דני');
    expect(lead!.city).toBe('הרצליה');
    expect(lead!.budgetMin).toBe(2000000);
    expect(lead!.status).toBe('qualified');

    // Conversation + messages
    const conv = await prisma.unscoped().conversation.findFirst({
      where: { tenantId: t.tenantId, leadId: lead!.id },
      include: { messages: true },
    });
    expect(conv).not.toBeNull();
    expect(conv!.messages.length).toBe(2);
    expect(conv!.messages.find((m) => m.senderType === 'ai_agent')?.body).toContain('הרצליה');

    // Outgoing message sent
    expect(MockWhatsAppProvider.sent.length).toBe(1);

    // Usage events: LLM + WhatsApp message
    const usage = await prisma.unscoped().usageEvent.findMany({
      where: { tenantId: t.tenantId },
    });
    expect(usage.length).toBeGreaterThanOrEqual(2);
    expect(usage.some((u) => u.type === 'llm_tokens')).toBe(true);
    expect(usage.some((u) => u.type === 'whatsapp_message')).toBe(true);
  });

  it('handoff_to_human tool sets conversation.handoff + opens task', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000002' },
    });

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'אעביר אותך לסוכן אנושי, מיד יחזרו אליך.',
        actions: [{ tool: 'handoff_to_human', args: { reason: 'customer asked for human' } }],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972500022222',
        to: '+97250000002',
        body: 'אני רוצה לדבר עם מתווך אמיתי',
        messageId: 'wamid.mock-2',
      })
      .expect(200);

    const conv = await prisma.unscoped().conversation.findFirst({
      where: { tenantId: t.tenantId },
    });
    expect(conv!.handoffRequired).toBe(true);
    expect(conv!.status).toBe('handoff');

    const task = await prisma.unscoped().task.findFirst({
      where: { tenantId: t.tenantId, createdByType: 'ai_agent' },
    });
    expect(task).not.toBeNull();
    expect(task!.title).toContain('אנושית');
  });

  it('opt-out tool suppresses reply on subsequent message from same phone', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000003' },
    });

    // First message: customer says stop. Mock LLM responds with opt-out.
    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'הוצאתי אותך מרשימת התפוצה.',
        actions: [{ tool: 'add_opt_out', args: { channel: 'whatsapp', reason: 'customer asked' } }],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972500033333',
        to: '+97250000003',
        body: 'תפסיקו לשלוח לי הודעות',
        messageId: 'wamid.mock-3',
      })
      .expect(200);

    // Verify opt-out and lead status
    const opt = await prisma.unscoped().optOut.findFirst({
      where: { tenantId: t.tenantId, phone: '+972500033333' },
    });
    expect(opt).not.toBeNull();
    const lead = await prisma.unscoped().lead.findFirst({
      where: { tenantId: t.tenantId, phone: '+972500033333' },
    });
    expect(lead!.status).toBe('opted_out');

    // Second message: should be suppressed (no reply, no new LLM call)
    MockWhatsAppProvider.sent = [];
    MockLlmProvider.pushResponse('SHOULD-NOT-BE-USED');
    const res = await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({
        from: '+972500033333',
        to: '+97250000003',
        body: 'שלום עוד פעם',
        messageId: 'wamid.mock-4',
      })
      .expect(200);

    expect(res.body.results[0].replied).toBe(false);
    expect(MockWhatsAppProvider.sent.length).toBe(0);
  });

  it('POST /agents/:id/test runs the agent without writing a real message', async () => {
    const t = await registerTenant(app);

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'הצעת טסט',
        actions: [{ tool: 'update_lead_fields', args: { intent: 'buy' } }],
      }),
    );

    // First, ensure an agent exists via list endpoint (will create via orchestrator path on first webhook)
    // — but for test, we'll create one directly.
    const agent = await prisma.unscoped().agent.create({
      data: {
        tenantId: t.tenantId,
        officeId: t.officeId,
        type: 'lead_responder',
        name: 'LR',
        status: 'active',
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/agents/${agent.id}/test`)
      .set(bearer(t.accessToken))
      .send({ message: 'אני מחפש דירה' })
      .expect(200);

    expect(res.body.reply).toBe('הצעת טסט');
    expect(res.body.actions).toEqual([{ tool: 'update_lead_fields', args: { intent: 'buy' } }]);
    expect(res.body.usage.provider).toBe('mock');
  });
});
