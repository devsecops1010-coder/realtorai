import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationSeverity,
  NotificationType,
  UsageEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface QuotaCheck {
  allowed: boolean;
  unlimited: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
}

/**
 * Enforces monthly usage caps from Tenant.includedMessages /
 * Tenant.includedCallMinutes. A tenant with `included* = 0` is treated as
 * unlimited (typical for new offices that haven't been billed yet). The
 * threshold notifications are emitted at 80% and 100% — once per tenant
 * per calendar month, tracked via a Notification metadata key.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkWhatsAppMessageQuota(tenantId: string): Promise<QuotaCheck> {
    const [tenant, used] = await Promise.all([
      this.prisma.unscoped().tenant.findUnique({
        where: { id: tenantId },
        select: { includedMessages: true },
      }),
      this.currentMonthUsage(tenantId, UsageEventType.whatsapp_message),
    ]);
    if (!tenant) {
      return { allowed: false, unlimited: false, currentUsage: 0, limit: 0, remaining: 0 };
    }
    const limit = tenant.includedMessages ?? 0;
    if (limit === 0) {
      return { allowed: true, unlimited: true, currentUsage: used, limit: 0, remaining: -1 };
    }
    return {
      allowed: used < limit,
      unlimited: false,
      currentUsage: used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  /**
   * Aggregate cost-based budget: sums UsageEvent.costEstimate for the current
   * month (across all LLM providers) and refuses the call when the tenant has
   * exhausted Tenant.monthlyLlmBudgetUsd. 0 = unlimited (default for new
   * tenants — the field is opt-in until billing is configured).
   *
   * Returned numbers are USD with up to 6 fractional digits. `currentUsage`
   * and `limit` are expressed in the same unit to keep callers simple.
   */
  async checkLlmBudget(tenantId: string): Promise<QuotaCheck> {
    const [tenant, used] = await Promise.all([
      this.prisma.unscoped().tenant.findUnique({
        where: { id: tenantId },
        select: { monthlyLlmBudgetUsd: true },
      }),
      this.currentMonthLlmCostUsd(tenantId),
    ]);
    if (!tenant) {
      return { allowed: false, unlimited: false, currentUsage: 0, limit: 0, remaining: 0 };
    }
    const limit = Number(tenant.monthlyLlmBudgetUsd ?? 0);
    if (limit === 0) {
      return { allowed: true, unlimited: true, currentUsage: used, limit: 0, remaining: -1 };
    }
    return {
      allowed: used < limit,
      unlimited: false,
      currentUsage: used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  async checkCallMinuteQuota(tenantId: string, minutes: number): Promise<QuotaCheck> {
    const [tenant, used] = await Promise.all([
      this.prisma.unscoped().tenant.findUnique({
        where: { id: tenantId },
        select: { includedCallMinutes: true },
      }),
      this.currentMonthUsage(tenantId, UsageEventType.call_minute),
    ]);
    if (!tenant) {
      return { allowed: false, unlimited: false, currentUsage: 0, limit: 0, remaining: 0 };
    }
    const limit = tenant.includedCallMinutes ?? 0;
    if (limit === 0) {
      return { allowed: true, unlimited: true, currentUsage: used, limit: 0, remaining: -1 };
    }
    return {
      allowed: used + minutes <= limit,
      unlimited: false,
      currentUsage: used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  /**
   * Called AFTER a billable event lands. Emits 80% / 100% notifications the
   * first time the tenant crosses each threshold in the current month.
   */
  async checkThresholdNotifications(
    tenantId: string,
    officeId: string | null,
    type: UsageEventType,
  ): Promise<void> {
    const check =
      type === UsageEventType.whatsapp_message
        ? await this.checkWhatsAppMessageQuota(tenantId)
        : type === UsageEventType.llm_tokens
          ? await this.checkLlmBudget(tenantId)
          : await this.checkCallMinuteQuota(tenantId, 0);

    if (check.unlimited || check.limit === 0) return;
    const pct = check.currentUsage / check.limit;

    const fireThreshold = async (level: 'warn80' | 'block100') => {
      const monthKey = new Date().toISOString().slice(0, 7);
      const already = await this.prisma.unscoped().notification.findFirst({
        where: {
          tenantId,
          type: NotificationType.system,
          metadata: {
            path: ['quotaAlert'],
            equals: `${type}-${level}-${monthKey}`,
          },
        },
      });
      if (already) return;

      await this.notifications.broadcast({
        tenantId,
        officeId,
        type: NotificationType.system,
        severity: level === 'block100' ? NotificationSeverity.alert : NotificationSeverity.warning,
        title:
          level === 'block100'
            ? '🛑 חרגת מההיקף החודשי'
            : '⚠️ 80% מההיקף החודשי נוצל',
        body:
          level === 'block100'
            ? `${labelFor(type)}: ${check.currentUsage}/${check.limit}. הודעות נוספות החודש ייתומחרו כחריגה.`
            : `${labelFor(type)}: ${check.currentUsage}/${check.limit}. נשארו ${check.remaining}.`,
        metadata: { quotaAlert: `${type}-${level}-${monthKey}` },
      });
    };

    if (pct >= 1) await fireThreshold('block100');
    else if (pct >= 0.8) await fireThreshold('warn80');
  }

  private async currentMonthUsage(tenantId: string, type: UsageEventType): Promise<number> {
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const agg = await this.prisma.unscoped().usageEvent.aggregate({
      where: { tenantId, type, createdAt: { gte: since } },
      _sum: { quantity: true },
    });
    return agg._sum.quantity ?? 0;
  }

  private async currentMonthLlmCostUsd(tenantId: string): Promise<number> {
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const agg = await this.prisma.unscoped().usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.llm_tokens,
        createdAt: { gte: since },
      },
      _sum: { costEstimate: true },
    });
    return Number(agg._sum.costEstimate ?? 0);
  }
}

function labelFor(type: UsageEventType): string {
  switch (type) {
    case UsageEventType.whatsapp_message: return 'הודעות WhatsApp';
    case UsageEventType.call_minute: return 'דקות שיחה';
    case UsageEventType.llm_tokens: return 'תקציב LLM (USD)';
    default: return String(type);
  }
}
