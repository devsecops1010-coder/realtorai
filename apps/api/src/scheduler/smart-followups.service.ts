import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadStatus, TaskStatus, TaskType, TaskCreatedByType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Smart-followups scheduler.
 *
 * Runs daily at 06:00 across all tenants and creates a "call this lead"
 * task for any lead that:
 *   - is in `contacted` or `qualified` (i.e. live in the funnel, not new),
 *   - has no open task already (we don't want to spam the realtor with
 *     duplicate followups when they already have one queued),
 *   - was last touched more than 3 days ago,
 *   - is not opted-out.
 *
 * Tasks are created as `system` so the audit log shows the scheduler as
 * the actor. They land in the assigned user's queue, or unassigned if the
 * lead doesn't have one (the office_manager sees those in /tasks).
 */
@Injectable()
export class SmartFollowupsService {
  private readonly logger = new Logger(SmartFollowupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 06:00 every day — early enough to be on the realtor's morning checklist,
  // late enough to dodge nightly DB maintenance windows.
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async scheduleFollowups(): Promise<void> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    let created = 0;

    // unscoped + tenantId-blind here: we're a global scheduler, we iterate
    // across tenants. The find query already restricts by status which
    // confines the working set.
    const candidates = await this.prisma.unscoped().lead.findMany({
      where: {
        status: { in: [LeadStatus.contacted, LeadStatus.qualified] },
        updatedAt: { lt: threeDaysAgo },
        // Skip leads with any non-completed task — we don't want to pile up
        // unread followups.
        tasks: {
          none: { status: { in: [TaskStatus.open, TaskStatus.in_progress, TaskStatus.snoozed] } },
        },
      },
      select: {
        id: true, tenantId: true, officeId: true, fullName: true, phone: true,
        assignedUserId: true,
      },
      // Cap so a single tenant with thousands of stale qualified leads can't
      // monopolize the cron run. Anything above this re-fires tomorrow.
      take: 500,
    });

    for (const lead of candidates) {
      const title = `התקשר ל-${lead.fullName ?? lead.phone ?? 'הליד'} (פולואפ)`;
      try {
        await this.prisma.unscoped().task.create({
          data: {
            tenantId: lead.tenantId,
            officeId: lead.officeId,
            leadId: lead.id,
            assignedUserId: lead.assignedUserId,
            title,
            description:
              'נוצר אוטומטית: הליד נמצא בשלב פעיל אך לא היה עדכון מ-3 ימים. בצע שיחת מעקב.',
            type: TaskType.followup,
            status: TaskStatus.open,
            createdByType: TaskCreatedByType.system,
            // Due tomorrow 10:00 — realtor sees it in the morning and has
            // the day to act on it.
            dueAt: new Date(new Date().setHours(10, 0, 0, 0) + 24 * 60 * 60 * 1000),
          } as Prisma.TaskUncheckedCreateInput,
        });
        created++;
      } catch (err) {
        // Don't let one bad insert kill the whole batch. Most likely cause
        // is FK churn from a tenant deleted mid-iteration.
        this.logger.warn(`Failed to create followup for lead ${lead.id}: ${(err as Error).message}`);
      }
    }

    if (created > 0) {
      this.logger.log(`Smart followups: created ${created} tasks across ${candidates.length} candidates`);
    }
  }
}
