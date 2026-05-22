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
