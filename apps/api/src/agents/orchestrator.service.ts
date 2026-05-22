import { Injectable, Logger } from '@nestjs/common';
import {
  AgentStatus,
  AgentType,
  ConversationChannel,
  ConversationStatus,
  LeadStatus,
  MessageSenderType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmRouterService } from '../llm/llm-router.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import type { IncomingMessage } from '../whatsapp/types';
import { ToolsService } from './tools/tools.service';
import { buildLeadResponderSystemPrompt } from './prompts/lead-responder.prompt';
import { parseAgentResponse } from './agent.types';
import type { LlmMessage } from '../llm/types';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouterService,
    private readonly whatsapp: WhatsAppService,
    private readonly tools: ToolsService,
  ) {}

  /**
   * Handle an incoming WhatsApp message. Returns the conversation id and the
   * outgoing reply (or null if no reply was sent — e.g. opted-out).
   */
  async handleIncoming(
    incoming: IncomingMessage,
    routing: { tenantId?: string; officeId?: string } = {},
  ): Promise<{ conversationId: string; replyBody: string | null }> {
    // 1. Resolve tenant + office.
    const office = await this.resolveOffice(incoming, routing);
    if (!office) {
      this.logger.warn(`No office matches WhatsApp message to ${incoming.to ?? 'unknown'}`);
      throw new Error('Office not found for this WhatsApp number');
    }

    // 2. Check opt-out.
    const opt = await this.prisma.unscoped().optOut.findFirst({
      where: { tenantId: office.tenantId, phone: incoming.from, channel: 'whatsapp' },
    });
    if (opt) {
      this.logger.log(`Skipping incoming from opted-out phone ${incoming.from}`);
      return { conversationId: '', replyBody: null };
    }

    // 3. Find or create lead.
    const lead = await this.findOrCreateLead(office.tenantId, office.id, incoming.from);

    // 4. Find or create conversation.
    const conversation = await this.findOrCreateConversation(
      office.tenantId,
      office.id,
      lead.id,
      incoming.provider,
    );

    // 5. Save incoming message.
    await this.prisma.unscoped().message.create({
      data: {
        tenantId: office.tenantId,
        conversationId: conversation.id,
        senderType: MessageSenderType.lead,
        body: incoming.body,
        metadata: { providerMessageId: incoming.providerMessageId } as Prisma.InputJsonValue,
      },
    });

    // 6. Load lead_responder agent (or create a default one).
    const agent = await this.ensureLeadResponderAgent(office.tenantId, office.id);
    if (agent.status === AgentStatus.disabled) {
      this.logger.log(`Lead responder disabled for tenant ${office.tenantId}`);
      return { conversationId: conversation.id, replyBody: null };
    }
    if (agent.status === AgentStatus.paused) {
      // Don't reply, just create a handoff task.
      await this.prisma.unscoped().task.create({
        data: {
          tenantId: office.tenantId,
          officeId: office.id,
          leadId: lead.id,
          title: 'הודעה התקבלה מליד — סוכן AI במצב השהיה',
          type: 'call_lead',
          status: 'open',
          createdByType: 'ai_agent',
        },
      });
      return { conversationId: conversation.id, replyBody: null };
    }

    // 7. Build prompt and call LLM.
    const recent = await this.prisma.unscoped().message.findMany({
      where: { tenantId: office.tenantId, conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { senderType: true, body: true },
    });

    const systemPrompt = buildLeadResponderSystemPrompt({
      officeName: office.name,
      city: office.city,
      areas: office.areas,
      lead: {
        fullName: lead.fullName,
        intent: lead.intent,
        city: lead.city,
        area: lead.area,
        budgetMin: lead.budgetMin,
        budgetMax: lead.budgetMax,
        rooms: lead.rooms ? Number(lead.rooms) : null,
        status: lead.status,
      },
      recentMessages: recent.reverse().map((m) => ({ senderType: m.senderType, body: m.body })),
      language: 'he',
    });

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: incoming.body },
    ];

    const llmResult = await this.llm.chat(messages, {
      tenantId: office.tenantId,
      officeId: office.id,
      agentId: agent.id,
      conversationId: conversation.id,
      intent: 'fast',
      responseFormat: 'json',
      temperature: 0.4,
    });

    const decision = parseAgentResponse(llmResult.content);

    // 8. Execute tool actions BEFORE sending reply, so the CRM reflects facts
    //    by the time the reply lands.
    const toolCtx = {
      tenantId: office.tenantId,
      officeId: office.id,
      agentId: agent.id,
      conversationId: conversation.id,
      leadId: lead.id,
      fromPhone: incoming.from,
    };
    for (const action of decision.actions) {
      await this.tools.execute(action.tool, action.args, toolCtx);
    }

    // 9. Save and send reply.
    if (!decision.reply.trim()) {
      return { conversationId: conversation.id, replyBody: null };
    }

    await this.prisma.unscoped().message.create({
      data: {
        tenantId: office.tenantId,
        conversationId: conversation.id,
        senderType: MessageSenderType.ai_agent,
        senderId: agent.id,
        body: decision.reply,
        metadata: { provider: llmResult.provider, model: llmResult.model } as Prisma.InputJsonValue,
      },
    });

    try {
      await this.whatsapp.send(
        office.tenantId,
        { to: incoming.from, body: decision.reply },
        { officeId: office.id, conversationId: conversation.id },
      );
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp reply: ${(err as Error).message}`);
    }

    return { conversationId: conversation.id, replyBody: decision.reply };
  }

  /**
   * Test the agent without going through WhatsApp — used by /agents/:id/test.
   */
  async runTest(
    tenantId: string,
    agentId: string,
    fakeMessage: string,
    leadHint?: { phone?: string; fullName?: string },
  ): Promise<{ reply: string; actions: { tool: string; args: unknown }[]; usage: unknown }> {
    const agent = await this.prisma.unscoped().agent.findFirst({
      where: { id: agentId, tenantId },
    });
    if (!agent) throw new Error('Agent not found');
    const office = await this.prisma.unscoped().office.findFirst({
      where: { id: agent.officeId ?? undefined, tenantId },
    });
    if (!office) throw new Error('Office not found for agent');

    const lead = leadHint?.phone
      ? await this.findOrCreateLead(tenantId, office.id, leadHint.phone, leadHint.fullName)
      : null;

    const systemPrompt = buildLeadResponderSystemPrompt({
      officeName: office.name,
      city: office.city,
      areas: office.areas,
      lead: {
        fullName: lead?.fullName ?? null,
        intent: lead?.intent ?? 'unknown',
        city: lead?.city ?? null,
        area: lead?.area ?? null,
        budgetMin: lead?.budgetMin ?? null,
        budgetMax: lead?.budgetMax ?? null,
        rooms: lead?.rooms ? Number(lead.rooms) : null,
        status: lead?.status ?? 'new',
      },
      recentMessages: [],
      language: 'he',
    });

    const result = await this.llm.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fakeMessage },
      ],
      {
        tenantId,
        officeId: office.id,
        agentId,
        intent: 'fast',
        responseFormat: 'json',
        temperature: 0.4,
      },
    );

    const decision = parseAgentResponse(result.content);
    return {
      reply: decision.reply,
      actions: decision.actions,
      usage: { provider: result.provider, model: result.model, usage: result.usage, latencyMs: result.latencyMs },
    };
  }

  private async resolveOffice(
    incoming: IncomingMessage,
    routing: { tenantId?: string; officeId?: string },
  ) {
    if (routing.officeId) {
      return this.prisma.unscoped().office.findFirst({
        where: { id: routing.officeId, ...(routing.tenantId && { tenantId: routing.tenantId }) },
      });
    }
    if (incoming.to) {
      const byNumber = await this.prisma.unscoped().office.findFirst({
        where: { whatsappNumber: incoming.to },
      });
      if (byNumber) return byNumber;
    }
    // Last-resort: if there's exactly one active office in the system (dev fixture).
    const offices = await this.prisma.unscoped().office.findMany({ where: { status: 'active' }, take: 2 });
    return offices.length === 1 ? offices[0] : null;
  }

  private async findOrCreateLead(
    tenantId: string,
    officeId: string,
    phone: string,
    fullName?: string,
  ) {
    const existing = await this.prisma.unscoped().lead.findFirst({
      where: { tenantId, officeId, phone },
    });
    if (existing) return existing;
    return this.prisma.unscoped().lead.create({
      data: {
        tenantId,
        officeId,
        phone,
        fullName: fullName ?? null,
        source: 'whatsapp',
        status: LeadStatus.new,
        temperature: 'warm',
      },
    });
  }

  private async findOrCreateConversation(
    tenantId: string,
    officeId: string,
    leadId: string,
    provider: string,
  ) {
    const channel = (['whatsapp', 'voice', 'web', 'form', 'manual'] as ConversationChannel[]).includes(
      provider as ConversationChannel,
    )
      ? (provider as ConversationChannel)
      : ConversationChannel.whatsapp;

    const open = await this.prisma.unscoped().conversation.findFirst({
      where: {
        tenantId,
        officeId,
        leadId,
        channel,
        status: { in: [ConversationStatus.active, ConversationStatus.waiting] },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (open) return open;
    return this.prisma.unscoped().conversation.create({
      data: {
        tenantId,
        officeId,
        leadId,
        channel,
        status: ConversationStatus.active,
      },
    });
  }

  private async ensureLeadResponderAgent(tenantId: string, officeId: string) {
    const existing = await this.prisma.unscoped().agent.findFirst({
      where: { tenantId, officeId, type: AgentType.lead_responder },
    });
    if (existing) return existing;
    return this.prisma.unscoped().agent.create({
      data: {
        tenantId,
        officeId,
        type: AgentType.lead_responder,
        name: 'Lead Responder',
        status: AgentStatus.active,
      },
    });
  }
}
