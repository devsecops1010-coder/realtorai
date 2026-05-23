import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { NotificationSeverity, NotificationType, Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { PushService } from '../push/push.service';

export interface CreateNotificationInput {
  tenantId: string;
  officeId?: string | null;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  /** If provided, deliver to these users. If not, broadcast to office_owner+manager. */
  userIds?: string[];
}

@Injectable()
export class NotificationsService {
  // PushService is optional — if the PushModule is loaded it gets injected;
  // otherwise broadcast() still works and just doesn't push. Marking it
  // optional avoids a circular-init headache during boot.
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly push?: PushService,
  ) {}

  async broadcast(input: CreateNotificationInput): Promise<number> {
    let targets = input.userIds ?? [];
    if (targets.length === 0) {
      const owners = await this.prisma.unscoped().user.findMany({
        where: {
          tenantId: input.tenantId,
          status: UserStatus.active,
          role: { in: [UserRole.office_owner, UserRole.office_manager] },
          ...(input.officeId && { officeId: input.officeId }),
        },
        select: { id: true },
      });
      targets = owners.map((o) => o.id);
    }

    if (targets.length === 0) {
      // No recipients yet — fall back to a single tenant-level notification.
      targets = [''];
    }

    await this.prisma.unscoped().notification.createMany({
      data: targets.map((userId) => ({
        tenantId: input.tenantId,
        officeId: input.officeId ?? null,
        userId: userId || null,
        type: input.type,
        severity: input.severity ?? NotificationSeverity.info,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      })),
    });

    // Push delivery — fire-and-forget per recipient. We only push for
    // user-targeted notifications (no userId means the notification is a
    // tenant-wide bell entry, not actionable per person).
    //
    // We only push for `alert` severity by default — the in-app bell already
    // handles `info` events without needing to interrupt the user. Callers
    // who want pushes for non-alert events can adjust severity.
    if (this.push && (input.severity ?? NotificationSeverity.info) === NotificationSeverity.alert) {
      const realTargets = targets.filter((t) => Boolean(t));
      // No `await` — we don't want the orchestrator path (which calls broadcast)
      // to block on browser push roundtrips. Errors are logged inside push.
      Promise.all(
        realTargets.map((userId) =>
          this.push!.sendToUser(userId, {
            title: input.title,
            body: input.body ?? '',
            url: input.link ?? '/dashboard',
            tag: `${input.type}-${(input.metadata?.leadId as string | undefined) ?? userId}`,
            data: input.metadata,
          }),
        ),
      ).catch(() => undefined);
    }

    return targets.length;
  }

  async listMine(opts: { unreadOnly?: boolean; take?: number } = {}) {
    const userId = RequestContext.getUserId();
    if (!userId) return [];

    return this.prisma.scoped.notification.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
        ...(opts.unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 100,
    });
  }

  async markRead(id: string) {
    const userId = RequestContext.getUserId();
    if (!userId) throw new NotFoundException('Not authenticated');
    const n = await this.prisma.scoped.notification.findFirst({ where: { id } });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.userId && n.userId !== userId) throw new NotFoundException('Notification not found');
    return this.prisma.scoped.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead() {
    const userId = RequestContext.getUserId();
    if (!userId) return 0;
    const res = await this.prisma.scoped.notification.updateMany({
      where: { OR: [{ userId }, { userId: null }], readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }
}
