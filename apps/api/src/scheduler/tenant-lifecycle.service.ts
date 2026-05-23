import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Daily housekeeping jobs that touch tenant-level lifecycle:
 *
 *   1. Trial expiry — any tenant with status='trial' and trialEndsAt < now()
 *      gets auto-suspended with reason="תקופת הניסיון הסתיימה". Refresh
 *      tokens are revoked so existing sessions die within one access-token
 *      TTL. Platform tenants (anyone with a platform_owner/admin user) are
 *      always skipped.
 *
 *   2. Audit log retention — events older than the configured TTL are
 *      deleted in batches. Critical events (suspend/reactivate/plan change)
 *      are kept forever — those are the ones the legal team will ask about.
 *
 * Both jobs run at 03:15 server time daily (off-peak Israel). Each is
 * idempotent — re-running on the same day is a no-op.
 *
 * Configurable via env:
 *   AUDIT_LOG_RETENTION_DAYS   default 180
 *   TRIAL_GRACE_HOURS          default 0  (set to 24+ to delay actual suspend)
 */
@Injectable()
export class TenantLifecycleService {
  private readonly logger = new Logger(TenantLifecycleService.name);

  // Audit actions we NEVER auto-delete — keep the legal/security trail intact.
  private readonly PROTECTED_ACTIONS = new Set([
    'tenant.suspended',
    'tenant.reactivated',
    'tenant.plan_changed',
    'tenant.demo_seeded',
    'office.deactivated',
    'office.reactivated',
    'auth.password.reset',
    'auth.activation.completed',
    'sign.document.uploaded',
    'sign.document.signed',
    'sign.request.created',
    'sign.request.cancelled',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /** 03:15 Asia/Jerusalem ≈ 01:15 UTC during DST. Run in UTC to be safe. */
  @Cron('15 1 * * *', { name: 'tenant-trial-expiry' })
  async expireTrials() {
    const graceHours = Number(process.env.TRIAL_GRACE_HOURS ?? '0');
    const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);

    const candidates = await this.prisma.unscoped().tenant.findMany({
      where: {
        status: TenantStatus.trial,
        trialEndsAt: { lte: cutoff, not: null },
      },
      select: { id: true, name: true, trialEndsAt: true },
    });

    if (candidates.length === 0) {
      this.logger.log('No expired trials to process');
      return;
    }

    let suspended = 0;
    let skipped = 0;
    for (const t of candidates) {
      // Skip platform-owning tenants — those are us, not customers.
      const platformUserCount = await this.prisma.unscoped().user.count({
        where: {
          tenantId: t.id,
          role: { in: [UserRole.platform_owner, UserRole.platform_admin] },
        },
      });
      if (platformUserCount > 0) {
        skipped += 1;
        continue;
      }

      await this.prisma.unscoped().$transaction([
        this.prisma.unscoped().tenant.update({
          where: { id: t.id },
          data: {
            status: TenantStatus.suspended,
            suspendedAt: new Date(),
            suspendedReason: 'תקופת הניסיון הסתיימה',
            suspendedByUserId: null, // system-driven, no human actor
          },
        }),
        this.prisma.unscoped().refreshToken.updateMany({
          where: { user: { tenantId: t.id }, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.unscoped().auditLog.create({
          data: {
            tenantId: t.id,
            actorType: 'system',
            action: 'tenant.suspended',
            targetType: 'tenant',
            targetId: t.id,
            metadata: { reason: 'trial_expired', trialEndsAt: t.trialEndsAt },
          },
        }),
      ]);
      suspended += 1;
      this.logger.warn(`Auto-suspended trial tenant: ${t.name} (${t.id})`);
    }

    this.logger.log(
      `Trial expiry pass: suspended=${suspended}, skipped(platform)=${skipped}`,
    );
  }

  /** Run after trial expiry — they're back-to-back daily jobs. */
  @Cron('30 1 * * *', { name: 'audit-log-retention' })
  async pruneAuditLogs() {
    const days = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? '180');
    if (days <= 0) {
      this.logger.log('AUDIT_LOG_RETENTION_DAYS=0 — pruning disabled');
      return;
    }
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.prisma.unscoped().auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        action: { notIn: Array.from(this.PROTECTED_ACTIONS) },
      },
    });

    this.logger.log(
      `Audit log retention pass: deleted ${result.count} rows older than ${days}d (excluding ${this.PROTECTED_ACTIONS.size} protected action types)`,
    );
  }
}
