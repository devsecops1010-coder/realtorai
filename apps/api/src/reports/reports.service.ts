import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async today() {
    const officeId = RequestContext.get().officeId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const where = { ...(officeId ? { officeId } : {}) };

    const [
      totalLeads,
      newLeadsToday,
      hotLeads,
      qualifiedLeads,
      meetingsScheduled,
      openTasks,
      tasksDueToday,
      handoffConvos,
      messagesToday,
    ] = await Promise.all([
      this.prisma.scoped.lead.count({ where }),
      this.prisma.scoped.lead.count({ where: { ...where, createdAt: { gte: startOfDay } } }),
      this.prisma.scoped.lead.count({ where: { ...where, temperature: 'hot' } }),
      this.prisma.scoped.lead.count({ where: { ...where, status: 'qualified' } }),
      this.prisma.scoped.lead.count({ where: { ...where, status: 'meeting_scheduled' } }),
      this.prisma.scoped.task.count({ where: { ...where, status: 'open' } }),
      this.prisma.scoped.task.count({
        where: {
          ...where,
          status: 'open',
          dueAt: { lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.scoped.conversation.count({ where: { ...where, handoffRequired: true, status: 'handoff' } }),
      this.prisma.scoped.message.count({ where: { createdAt: { gte: startOfDay } } }),
    ]);

    return {
      date: startOfDay.toISOString().slice(0, 10),
      counts: {
        totalLeads,
        newLeadsToday,
        hotLeads,
        qualifiedLeads,
        meetingsScheduled,
        openTasks,
        tasksDueToday,
        handoffConvos,
        messagesToday,
      },
    };
  }

  /**
   * Funnel view: lead count per status, ordered from "new" to "terminal".
   * Designed for the dashboard pipeline widget — returns an array of
   * `{ status, label, count }` so the UI can render bars without knowing
   * the enum order.
   */
  async funnel() {
    const officeId = RequestContext.get().officeId;
    const where = { ...(officeId ? { officeId } : {}) };
    // Single SQL GROUP BY beats 9 sequential count() calls for big tenants.
    const grouped = await this.prisma.scoped.lead.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    const byStatus = new Map(grouped.map((r) => [r.status, r._count._all]));
    // Funnel order: live first, terminal last. The UI uses the index for
    // gradient + width.
    const order: { status: 'new' | 'contacted' | 'qualified' | 'hot' | 'meeting_scheduled' | 'handoff_to_human' | 'no_answer' | 'not_relevant' | 'opted_out'; label: string }[] = [
      { status: 'new', label: 'חדש' },
      { status: 'contacted', label: 'נוצר קשר' },
      { status: 'qualified', label: 'מוסמך' },
      { status: 'hot', label: 'חם' },
      { status: 'meeting_scheduled', label: 'פגישה נקבעה' },
      { status: 'handoff_to_human', label: 'הועבר למתווך' },
      { status: 'no_answer', label: 'אין מענה' },
      { status: 'not_relevant', label: 'לא רלוונטי' },
      { status: 'opted_out', label: 'הוסר' },
    ];
    const total = order.reduce((sum, s) => sum + (byStatus.get(s.status) ?? 0), 0);
    return {
      total,
      stages: order.map((s) => ({
        status: s.status,
        label: s.label,
        count: byStatus.get(s.status) ?? 0,
      })),
    };
  }

  async usageSummary() {
    const officeId = RequestContext.get().officeId;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const raw = await this.prisma.scoped.usageEvent.groupBy({
      by: ['type', 'provider'],
      where: {
        ...(officeId ? { officeId } : {}),
        createdAt: { gte: startOfMonth },
      },
      _sum: { quantity: true, costEstimate: true },
    });

    return {
      monthStart: startOfMonth.toISOString(),
      items: raw.map((r) => ({
        type: r.type,
        provider: r.provider,
        quantity: r._sum.quantity ?? 0,
        costEstimate: r._sum.costEstimate?.toString() ?? '0',
      })),
    };
  }
}
