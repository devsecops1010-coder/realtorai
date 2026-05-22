import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockLlmProvider } from '../src/llm/providers/mock.provider';
import { MockWhatsAppProvider } from '../src/whatsapp/providers/mock.provider';
import { registerTenant } from './utils/factories';

describe('Billing enforcement + Zod tool validation (e2e)', () => {
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

  it('Zod tool validation rejects malformed tool args without crashing the agent', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000200' },
    });

    // Bad args: rooms is a string instead of number, status is unknown enum value
    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'תודה',
        actions: [
          { tool: 'update_lead_fields', args: { rooms: 'too many', city: 12345 } },
          { tool: 'update_lead_status', args: { status: 'super_hot' } },
        ],
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ from: '+972503000001', to: '+97250000200', body: 'שלום', messageId: 'v-1' })
      .expect(200);
    expect(res.body.processed).toBe(1);

    // Conversation should exist and have a reply
    const conv = await prisma.unscoped().conversation.findFirst({
      where: { tenantId: t.tenantId },
      include: { messages: true },
    });
    expect(conv).not.toBeNull();
    expect(conv!.messages.length).toBe(2);

    // Audit logs should record the rejected tool calls
    const rejections = await prisma.unscoped().auditLog.findMany({
      where: { tenantId: t.tenantId, action: 'tool.invalid_args' },
    });
    expect(rejections.length).toBe(2);

    // Lead must NOT have city=12345 or rooms="too many" — fields stayed null
    const lead = await prisma.unscoped().lead.findFirst({
      where: { tenantId: t.tenantId, phone: '+972503000001' },
    });
    expect(lead!.city).toBeNull();
    expect(lead!.rooms).toBeNull();
  });

  it('record_mortgage_consent requires consentText ≥ 10 chars (Zod)', async () => {
    const t = await registerTenant(app);
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000201' },
    });

    MockLlmProvider.pushResponse(
      JSON.stringify({
        reply: 'אישרת?',
        actions: [
          { tool: 'collect_mortgage_info', args: { estimatedPrice: 1_500_000 } },
          { tool: 'record_mortgage_consent', args: { consent: true, consentText: 'ok' } },
        ],
      }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ from: '+972503000002', to: '+97250000201', body: 'קונה דירה', messageId: 'v-2' })
      .expect(200);

    // Profile exists from collect_mortgage_info, but consent was rejected
    const profile = await prisma.unscoped().mortgageProfile.findFirst({
      where: { tenantId: t.tenantId },
    });
    expect(profile).not.toBeNull();
    expect(profile!.consentToShareWithAdvisor).toBe(false);
    expect(profile!.consentTimestamp).toBeNull();

    const rejection = await prisma.unscoped().auditLog.findFirst({
      where: { tenantId: t.tenantId, action: 'tool.invalid_args' },
    });
    expect(rejection).not.toBeNull();
    expect((rejection!.metadata as any).target.tool).toBe('record_mortgage_consent');
  });

  it('WhatsApp send blocked once tenant exceeds includedMessages cap', async () => {
    const t = await registerTenant(app);
    // Cap the tenant at 1 outbound message/month
    await prisma.unscoped().tenant.update({
      where: { id: t.tenantId },
      data: { includedMessages: 1 },
    });
    await prisma.unscoped().office.update({
      where: { id: t.officeId },
      data: { whatsappNumber: '+97250000202' },
    });

    // First incoming → agent replies → 1 outbound message uses the quota
    MockLlmProvider.pushResponse(JSON.stringify({ reply: 'תגובה ראשונה', actions: [] }));
    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ from: '+972503000003', to: '+97250000202', body: 'הודעה 1', messageId: 'b-1' })
      .expect(200);

    expect(MockWhatsAppProvider.sent.length).toBe(1);

    // Second incoming → agent tries to reply but billing blocks the send
    MockLlmProvider.pushResponse(JSON.stringify({ reply: 'תגובה שניה — אסור לשלוח', actions: [] }));
    await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .send({ from: '+972503000003', to: '+97250000202', body: 'הודעה 2', messageId: 'b-2' })
      .expect(200);

    // Still only 1 outbound message in mock provider
    expect(MockWhatsAppProvider.sent.length).toBe(1);

    // A 100% quota notification should have been raised
    const quotaNotif = await prisma.unscoped().notification.findFirst({
      where: { tenantId: t.tenantId, type: 'system', title: { contains: 'חרגת' } },
    });
    expect(quotaNotif).not.toBeNull();
  });
});
