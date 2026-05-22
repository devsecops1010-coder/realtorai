import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, TaskCreatedByType, TaskStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Every 5 minutes: for any lead whose nextFollowupAt has just passed,
   * open a `followup` task (if not already open) and notify the office.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'process-due-followups' })
  async processDueFollowups() {
    const now = new Date();
    const leads = await this.prisma.unscoped().lead.findMany({
      where: {
        nextFollowupAt: { lte: now, gte: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
      },
      select: { id: true, tenantId: true, officeId: true, fullName: true, phone: true },
      take: 200,
    });

    let created = 0;
    for (const lead of leads) {
      const existing = await this.prisma.unscoped().task.findFirst({
        where: {
          tenantId: lead.tenantId,
          leadId: lead.id,
          type: TaskType.followup,
          status: { in: [TaskStatus.open, TaskStatus.in_progress] },
        },
      });
      if (existing) continue;

      await this.prisma.unscoped().task.create({
        data: {
          tenantId: lead.tenantId,
          officeId: lead.officeId,
          leadId: lead.id,
          title: `פולואפ עם ${lead.fullName ?? lead.phone ?? 'ליד'}`,
          type: TaskType.followup,
          status: TaskStatus.open,
          dueAt: now,
          createdByType: TaskCreatedByType.system,
        },
      });

      await this.notifications.broadcast({
        tenantId: lead.tenantId,
        officeId: lead.officeId,
        type: NotificationType.followup_due,
        title: 'פולואפ ממתין',
        body: `${lead.fullName ?? lead.phone ?? 'ליד'} — דרוש פולואפ`,
        link: `/leads/${lead.id}`,
        metadata: { leadId: lead.id },
      });

      created++;
      // Clear the followup marker so we don't re-create on next tick.
      await this.prisma.unscoped().lead.update({
        where: { id: lead.id, tenantId: lead.tenantId },
        data: { nextFollowupAt: null },
      });
    }

    if (created > 0) {
      this.logger.log(`Created ${created} followup tasks from due reminders`);
    }
  }

  /**
   * Once a day at 06:00 UTC (~08:00 Israel time): one summary notification per
   * active office.
   */
  @Cron('0 6 * * *', { name: 'daily-summary' })
  async dailySummary() {
    const offices = await this.prisma.unscoped().office.findMany({
      where: { status: 'active' },
      select: { id: true, tenantId: true, name: true },
    });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const office of offices) {
      const [newLeads, hotLeads, openTasks] = await Promise.all([
        this.prisma.unscoped().lead.count({
          where: { tenantId: office.tenantId, officeId: office.id, createdAt: { gte: since } },
        }),
        this.prisma.unscoped().lead.count({
          where: { tenantId: office.tenantId, officeId: office.id, temperature: 'hot' },
        }),
        this.prisma.unscoped().task.count({
          where: { tenantId: office.tenantId, officeId: office.id, status: TaskStatus.open },
        }),
      ]);

      if (newLeads === 0 && hotLeads === 0 && openTasks === 0) continue;

      await this.notifications.broadcast({
        tenantId: office.tenantId,
        officeId: office.id,
        type: NotificationType.daily_summary,
        title: `סיכום יומי — ${office.name}`,
        body: `${newLeads} לידים חדשים אתמול, ${hotLeads} לידים חמים פתוחים, ${openTasks} משימות פתוחות.`,
        metadata: { newLeads, hotLeads, openTasks },
      });
    }
    this.logger.log(`Daily summary sent for ${offices.length} offices`);
  }
}
