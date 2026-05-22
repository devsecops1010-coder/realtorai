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
        case 'collect_mortgage_info':
          return await this.collectMortgageInfo(args, ctx);
        case 'record_mortgage_consent':
          return await this.recordMortgageConsent(args, ctx);
        case 'refer_to_mortgage_advisor':
          return await this.referToMortgageAdvisor(args, ctx);
        case 'mark_mortgage_not_relevant':
          return await this.markMortgageNotRelevant(args, ctx);
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

  // ---------- Mortgage tools ----------

  private async ensureMortgageProfile(ctx: ToolContext) {
    if (!ctx.leadId) throw new Error('No leadId in context');
    const existing = await this.prisma.unscoped().mortgageProfile.findFirst({
      where: { tenantId: ctx.tenantId, leadId: ctx.leadId },
    });
    if (existing) return existing;
    return this.prisma.unscoped().mortgageProfile.create({
      data: { tenantId: ctx.tenantId, leadId: ctx.leadId },
    });
  }

  private computeReadinessScore(p: {
    estimatedPrice: number | null;
    estimatedEquity: number | null;
    hasPreApproval: boolean;
    monthlyIncome: number | null;
  }): { score: number; bucket: 'unknown' | 'not_ready' | 'partial' | 'ready' | 'approved' } {
    let score = 0;
    if (p.hasPreApproval) score += 50;
    if (p.estimatedPrice && p.estimatedPrice > 0) score += 10;
    if (p.monthlyIncome && p.monthlyIncome >= 12000) score += 15;
    if (p.estimatedEquity && p.estimatedPrice && p.estimatedEquity / p.estimatedPrice >= 0.25) score += 20;
    else if (p.estimatedEquity && p.estimatedPrice) score += 5;
    score = Math.min(100, score);
    let bucket: 'unknown' | 'not_ready' | 'partial' | 'ready' | 'approved' = 'unknown';
    if (p.hasPreApproval) bucket = 'approved';
    else if (score >= 60) bucket = 'ready';
    else if (score >= 30) bucket = 'partial';
    else if (p.estimatedPrice || p.estimatedEquity || p.monthlyIncome) bucket = 'not_ready';
    return { score, bucket };
  }

  private async collectMortgageInfo(args: {
    estimatedPrice?: number;
    estimatedEquity?: number;
    monthlyIncome?: number;
    hasPreApproval?: boolean;
    preApprovalAmount?: number;
    preApprovalBank?: string;
  }, ctx: ToolContext): Promise<ToolResult> {
    const profile = await this.ensureMortgageProfile(ctx);
    const data: Prisma.MortgageProfileUncheckedUpdateInput = {};
    if (args.estimatedPrice !== undefined) data.estimatedPrice = args.estimatedPrice;
    if (args.estimatedEquity !== undefined) data.estimatedEquity = args.estimatedEquity;
    if (args.monthlyIncome !== undefined) data.monthlyIncome = args.monthlyIncome;
    if (args.hasPreApproval !== undefined) data.hasPreApproval = args.hasPreApproval;
    if (args.preApprovalAmount !== undefined) data.preApprovalAmount = args.preApprovalAmount;
    if (args.preApprovalBank !== undefined) data.preApprovalBank = args.preApprovalBank;

    const merged = {
      estimatedPrice: args.estimatedPrice ?? profile.estimatedPrice,
      estimatedEquity: args.estimatedEquity ?? profile.estimatedEquity,
      hasPreApproval: args.hasPreApproval ?? profile.hasPreApproval,
      monthlyIncome: args.monthlyIncome ?? profile.monthlyIncome,
    };
    const r = this.computeReadinessScore(merged);
    data.readinessScore = r.score;
    data.readiness = r.bucket as any;

    const becomesPreApproved = args.hasPreApproval === true && !profile.hasPreApproval;
    if (becomesPreApproved) {
      data.status = 'pre_approved';
    } else if (profile.status === 'unknown') {
      data.status = 'needs_advisor';
    }

    const updated = await this.prisma.unscoped().mortgageProfile.update({
      where: { id: profile.id, tenantId: ctx.tenantId },
      data,
    });
    await this.audit(ctx, 'mortgage.profile_update.ai', { profileId: profile.id });

    if (becomesPreApproved) {
      await this.notifications.broadcast({
        tenantId: ctx.tenantId,
        officeId: ctx.officeId,
        type: NotificationType.mortgage_pre_approved,
        severity: NotificationSeverity.alert,
        title: '✅ ליד עם אישור עקרוני',
        body: `לקוח הצהיר על אישור עקרוני${args.preApprovalBank ? ' מ-' + args.preApprovalBank : ''}`,
        link: ctx.leadId ? `/leads/${ctx.leadId}` : null,
        metadata: { leadId: ctx.leadId, profileId: profile.id },
      } as any);
    }

    return { ok: true, data: { profileId: updated.id, readinessScore: updated.readinessScore } };
  }

  private async recordMortgageConsent(args: { consent: boolean; consentText: string }, ctx: ToolContext): Promise<ToolResult> {
    if (typeof args.consent !== 'boolean') return { ok: false, error: 'consent (boolean) required' };
    if (!args.consentText || args.consentText.length < 10) {
      return { ok: false, error: 'consentText must capture the wording the customer agreed to' };
    }
    const profile = await this.ensureMortgageProfile(ctx);
    const updated = await this.prisma.unscoped().mortgageProfile.update({
      where: { id: profile.id, tenantId: ctx.tenantId },
      data: {
        consentToShareWithAdvisor: args.consent,
        consentTimestamp: args.consent ? new Date() : null,
        consentText: args.consentText,
      },
    });
    await this.audit(ctx, 'mortgage.consent.ai', { profileId: profile.id, consent: args.consent });
    return { ok: true, data: { consent: updated.consentToShareWithAdvisor } };
  }

  private async referToMortgageAdvisor(args: { advisorId: string; notes?: string }, ctx: ToolContext): Promise<ToolResult> {
    if (!args.advisorId) return { ok: false, error: 'advisorId required' };
    const profile = await this.ensureMortgageProfile(ctx);
    if (!profile.consentToShareWithAdvisor) {
      return { ok: false, error: 'אסור להעביר ליועץ ללא הסכמה מפורשת. קרא תחילה ל-record_mortgage_consent' };
    }
    const advisor = await this.prisma.unscoped().mortgageAdvisor.findFirst({
      where: { id: args.advisorId, tenantId: ctx.tenantId },
    });
    if (!advisor) return { ok: false, error: 'Advisor not found' };
    if (advisor.status !== 'active') return { ok: false, error: 'Advisor is not active' };

    const referral = await this.prisma.unscoped().mortgageReferral.create({
      data: {
        tenantId: ctx.tenantId,
        mortgageProfileId: profile.id,
        advisorId: advisor.id,
        notes: args.notes ?? null,
      },
    });
    await this.prisma.unscoped().mortgageProfile.update({
      where: { id: profile.id, tenantId: ctx.tenantId },
      data: { status: 'referred' },
    });

    await this.audit(ctx, 'mortgage.referral.ai', { referralId: referral.id, advisorId: advisor.id });

    await this.notifications.broadcast({
      tenantId: ctx.tenantId,
      officeId: ctx.officeId,
      type: NotificationType.mortgage_referred,
      severity: NotificationSeverity.info,
      title: '💰 הליד הופנה ליועץ משכנתאות',
      body: `הופנה ל-${advisor.fullName}`,
      link: ctx.leadId ? `/leads/${ctx.leadId}` : null,
      metadata: { leadId: ctx.leadId, profileId: profile.id, advisorId: advisor.id },
    } as any);

    return { ok: true, data: { referralId: referral.id } };
  }

  private async markMortgageNotRelevant(args: { reason?: string }, ctx: ToolContext): Promise<ToolResult> {
    const profile = await this.ensureMortgageProfile(ctx);
    const updated = await this.prisma.unscoped().mortgageProfile.update({
      where: { id: profile.id, tenantId: ctx.tenantId },
      data: { status: 'not_relevant', notes: args.reason ?? null },
    });
    await this.audit(ctx, 'mortgage.not_relevant.ai', { profileId: profile.id, reason: args.reason });
    await this.notifications.broadcast({
      tenantId: ctx.tenantId,
      officeId: ctx.officeId,
      type: NotificationType.mortgage_not_relevant,
      severity: NotificationSeverity.info,
      title: 'לקוח ללא צורך במשכנתא',
      body: args.reason ?? 'הלקוח אינו זקוק למשכנתא',
      link: ctx.leadId ? `/leads/${ctx.leadId}` : null,
      metadata: { leadId: ctx.leadId, profileId: profile.id },
    } as any);
    return { ok: true, data: { profileId: updated.id } };
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
