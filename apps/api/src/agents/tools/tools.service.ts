import { Injectable, Logger } from '@nestjs/common';
import {
  LeadIntent,
  LeadStatus,
  LeadTemperature,
  NotificationSeverity,
  NotificationType,
  OptOutChannel,
  Prisma,
  PropertyCondition,
  PropertyDealType,
  PropertyStatus,
  TaskCreatedByType,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/context/request-context';
import { NotificationsService } from '../../notifications/notifications.service';
import type { ToolContext, ToolResult } from './tool.types';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async execute(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    this.logger.debug(`Tool ${name} called by agent ${ctx.agentId}`);
    // All tool calls happen unscoped — agent doesn't go through HTTP layer that sets CLS.
    // We use RequestContext.runUnscoped to bypass tenant guard but pass tenantId explicitly.
    return RequestContext.runUnscoped(() => this.dispatch(name, args, ctx));
  }

  private async dispatch(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    try {
      switch (name) {
        case 'update_lead_status':
          return await this.updateLeadStatus(args, ctx);
        case 'update_lead_fields':
          return await this.updateLeadFields(args, ctx);
        case 'add_conversation_summary':
          return await this.addConversationSummary(args, ctx);
        case 'schedule_followup':
          return await this.scheduleFollowup(args, ctx);
        case 'create_task_for_realtor':
          return await this.createTaskForRealtor(args, ctx);
        case 'add_opt_out':
          return await this.addOptOut(args, ctx);
        case 'handoff_to_human':
          return await this.handoffToHuman(args, ctx);
        case 'create_property':
          return await this.createProperty(args, ctx);
        case 'update_property_fields':
          return await this.updatePropertyFields(args, ctx);
        default:
          return { ok: false, error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Tool ${name} failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  private async updateLeadStatus(
    args: { status: LeadStatus; temperature?: LeadTemperature },
    ctx: ToolContext,
  ): Promise<ToolResult> {
    if (!ctx.leadId) return { ok: false, error: 'No leadId in context' };
    const before = await this.prisma.unscoped().lead.findFirst({
      where: { id: ctx.leadId, tenantId: ctx.tenantId },
      select: { temperature: true, status: true },
    });
    const updated = await this.prisma.unscoped().lead.update({
      where: { id: ctx.leadId, tenantId: ctx.tenantId },
      data: {
        status: args.status,
        ...(args.temperature && { temperature: args.temperature }),
      },
      select: { id: true, status: true, temperature: true, fullName: true, phone: true, officeId: true },
    });
    await this.audit(ctx, 'lead.status_update.ai', updated);

    if (before && before.temperature !== 'hot' && updated.temperature === 'hot') {
      await this.notifications.broadcast({
        tenantId: ctx.tenantId,
        officeId: updated.officeId,
        type: NotificationType.hot_lead,
        severity: NotificationSeverity.alert,
        title: '🔥 ליד חם',
        body: `${updated.fullName ?? updated.phone ?? 'ליד'} סומן כחם על ידי הסוכן`,
        link: `/leads/${updated.id}`,
        metadata: { leadId: updated.id, reason: 'temperature_to_hot' },
      });
    }

    return { ok: true, data: updated };
  }

  private async updateLeadFields(args: {
    fullName?: string;
    intent?: LeadIntent;
    city?: string;
    area?: string;
    budgetMin?: number;
    budgetMax?: number;
    rooms?: number;
  }, ctx: ToolContext): Promise<ToolResult> {
    if (!ctx.leadId) return { ok: false, error: 'No leadId in context' };
    const data: Prisma.LeadUncheckedUpdateInput = {};
    if (args.fullName) data.fullName = args.fullName;
    if (args.intent) data.intent = args.intent;
    if (args.city) data.city = args.city;
    if (args.area) data.area = args.area;
    if (typeof args.budgetMin === 'number') data.budgetMin = args.budgetMin;
    if (typeof args.budgetMax === 'number') data.budgetMax = args.budgetMax;
    if (typeof args.rooms === 'number') data.rooms = args.rooms;
    const updated = await this.prisma.unscoped().lead.update({
      where: { id: ctx.leadId, tenantId: ctx.tenantId },
      data,
    });
    await this.audit(ctx, 'lead.fields_update.ai', updated);
    return { ok: true, data: updated };
  }

  private async addConversationSummary(
    args: { summary: string },
    ctx: ToolContext,
  ): Promise<ToolResult> {
    if (!ctx.conversationId) return { ok: false, error: 'No conversationId in context' };
    const updated = await this.prisma.unscoped().conversation.update({
      where: { id: ctx.conversationId, tenantId: ctx.tenantId },
      data: { summary: args.summary },
      select: { id: true, summary: true },
    });
    await this.audit(ctx, 'conversation.summary.ai', updated);
    return { ok: true, data: updated };
  }

  private async scheduleFollowup(
    args: { atIso: string; reason?: string },
    ctx: ToolContext,
  ): Promise<ToolResult> {
    if (!ctx.leadId) return { ok: false, error: 'No leadId in context' };
    const at = new Date(args.atIso);
    if (isNaN(at.getTime())) return { ok: false, error: `Invalid atIso: ${args.atIso}` };
    if (at.getTime() <= Date.now()) return { ok: false, error: 'atIso must be in the future' };
    const updated = await this.prisma.unscoped().lead.update({
      where: { id: ctx.leadId, tenantId: ctx.tenantId },
      data: { nextFollowupAt: at, ...(args.reason && { notes: args.reason }) },
      select: { id: true, nextFollowupAt: true },
    });
    await this.audit(ctx, 'lead.followup_scheduled.ai', updated);
    return { ok: true, data: updated };
  }

  private async createTaskForRealtor(args: {
    title: string;
    description?: string;
    type?: TaskType;
    assignedUserId?: string;
    dueAtIso?: string;
  }, ctx: ToolContext): Promise<ToolResult> {
    const task = await this.prisma.unscoped().task.create({
      data: {
        tenantId: ctx.tenantId,
        officeId: ctx.officeId,
        leadId: ctx.leadId,
        assignedUserId: args.assignedUserId ?? null,
        type: args.type ?? TaskType.followup,
        title: args.title.trim(),
        description: args.description ?? null,
        status: TaskStatus.open,
        dueAt: args.dueAtIso ? new Date(args.dueAtIso) : null,
        createdByType: TaskCreatedByType.ai_agent,
        createdById: ctx.agentId,
      },
      select: { id: true, title: true, status: true },
    });
    await this.audit(ctx, 'task.create.ai', task);
    return { ok: true, data: task };
  }

  private async addOptOut(
    args: { channel?: OptOutChannel; reason?: string },
    ctx: ToolContext,
  ): Promise<ToolResult> {
    if (!ctx.fromPhone) return { ok: false, error: 'No phone in context for opt-out' };
    const channel = args.channel ?? OptOutChannel.whatsapp;

    await this.prisma.unscoped().$transaction(async (tx) => {
      await tx.optOut.upsert({
        where: {
          tenantId_phone_channel: {
            tenantId: ctx.tenantId,
            phone: ctx.fromPhone!,
            channel,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          phone: ctx.fromPhone!,
          channel,
          reason: args.reason ?? null,
        },
        update: { reason: args.reason ?? null },
      });
      if (ctx.leadId) {
        await tx.lead.update({
          where: { id: ctx.leadId, tenantId: ctx.tenantId },
          data: { status: LeadStatus.opted_out },
        });
      }
    });

    await this.audit(ctx, 'lead.opt_out.ai', { phone: ctx.fromPhone, channel });
    return { ok: true, data: { phone: ctx.fromPhone, channel } };
  }

  private async handoffToHuman(
    args: { reason: string; createTask?: boolean },
    ctx: ToolContext,
  ): Promise<ToolResult> {
    if (!ctx.conversationId) return { ok: false, error: 'No conversationId in context' };

    await this.prisma.unscoped().$transaction(async (tx) => {
      const conv = await tx.conversation.findFirst({
        where: { id: ctx.conversationId!, tenantId: ctx.tenantId },
      });
      if (!conv) throw new Error('Conversation not found');

      await tx.conversation.update({
        where: { id: ctx.conversationId!, tenantId: ctx.tenantId },
        data: {
          handoffRequired: true,
          status: 'handoff',
          metadata: {
            ...((conv.metadata as object) ?? {}),
            handoffReason: args.reason,
            handoffByAgent: ctx.agentId,
          },
        },
      });

      if (ctx.leadId) {
        await tx.lead.update({
          where: { id: ctx.leadId, tenantId: ctx.tenantId },
          data: { status: LeadStatus.handoff_to_human },
        });
      }

      if (args.createTask !== false) {
        await tx.task.create({
          data: {
            tenantId: ctx.tenantId,
            officeId: ctx.officeId,
            leadId: ctx.leadId,
            title: `שיחה דורשת התייחסות אנושית: ${args.reason}`,
            type: TaskType.call_lead,
            status: TaskStatus.open,
            createdByType: TaskCreatedByType.ai_agent,
            createdById: ctx.agentId,
          },
        });
      }
    });

    await this.audit(ctx, 'conversation.handoff.ai', { reason: args.reason });

    await this.notifications.broadcast({
      tenantId: ctx.tenantId,
      officeId: ctx.officeId,
      type: NotificationType.handoff_required,
      severity: NotificationSeverity.alert,
      title: '🤝 דרושה התערבות אנושית',
      body: `שיחה הועברה: ${args.reason}`,
      link: `/conversations/${ctx.conversationId}`,
      metadata: { conversationId: ctx.conversationId, reason: args.reason },
    });

    return { ok: true };
  }

  private async createProperty(args: {
    dealType: PropertyDealType;
    city?: string;
    area?: string;
    street?: string;
    rooms?: number;
    floor?: number;
    price?: number;
    condition?: PropertyCondition;
    notes?: string;
  }, ctx: ToolContext): Promise<ToolResult> {
    if (!args.dealType) return { ok: false, error: 'dealType is required' };
    const property = await this.prisma.unscoped().property.create({
      data: {
        tenantId: ctx.tenantId,
        officeId: ctx.officeId,
        ownerLeadId: ctx.leadId,
        dealType: args.dealType,
        city: args.city ?? null,
        area: args.area ?? null,
        street: args.street ?? null,
        rooms: args.rooms ?? null,
        floor: args.floor ?? null,
        price: args.price ?? null,
        condition: args.condition ?? null,
        status: PropertyStatus.draft,
        notes: args.notes ?? null,
      },
    });
    await this.audit(ctx, 'property.create.ai', { propertyId: property.id });
    return { ok: true, data: { id: property.id } };
  }

  private async updatePropertyFields(args: {
    propertyId: string;
    city?: string;
    area?: string;
    street?: string;
    rooms?: number;
    floor?: number;
    price?: number;
    condition?: PropertyCondition;
    notes?: string;
  }, ctx: ToolContext): Promise<ToolResult> {
    if (!args.propertyId) return { ok: false, error: 'propertyId is required' };
    const existing = await this.prisma.unscoped().property.findFirst({
      where: { id: args.propertyId, tenantId: ctx.tenantId },
    });
    if (!existing) return { ok: false, error: 'Property not found' };

    const data: Prisma.PropertyUncheckedUpdateInput = {};
    if (args.city !== undefined) data.city = args.city;
    if (args.area !== undefined) data.area = args.area;
    if (args.street !== undefined) data.street = args.street;
    if (args.rooms !== undefined) data.rooms = args.rooms;
    if (args.floor !== undefined) data.floor = args.floor;
    if (args.price !== undefined) data.price = args.price;
    if (args.condition !== undefined) data.condition = args.condition;
    if (args.notes !== undefined) data.notes = args.notes;

    const property = await this.prisma.unscoped().property.update({
      where: { id: args.propertyId, tenantId: ctx.tenantId },
      data,
    });
    await this.audit(ctx, 'property.update.ai', { propertyId: property.id });
    return { ok: true, data: { id: property.id } };
  }

  private async audit(ctx: ToolContext, action: string, target: unknown) {
    try {
      await this.prisma.unscoped().auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          actorType: 'ai_agent',
          actorId: ctx.agentId,
          action,
          targetType: 'tool',
          targetId: ctx.leadId ?? ctx.conversationId,
          metadata: { target: target as Prisma.InputJsonValue, conversationId: ctx.conversationId },
        },
      });
    } catch (err) {
      this.logger.error('Failed to audit tool call', err);
    }
  }
}
