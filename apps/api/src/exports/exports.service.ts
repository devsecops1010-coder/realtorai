import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'string' ? v : String(v);
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n') + '\n';
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async leadsCsv(): Promise<string> {
    const leads = await this.prisma.scoped.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedUser: { select: { name: true } },
        office: { select: { name: true } },
      },
      take: 10000,
    });
    return toCsv(
      [
        'id',
        'createdAt',
        'office',
        'fullName',
        'phone',
        'email',
        'intent',
        'city',
        'area',
        'budgetMin',
        'budgetMax',
        'rooms',
        'status',
        'temperature',
        'assignedTo',
        'source',
      ],
      leads.map((l) => [
        l.id,
        l.createdAt.toISOString(),
        l.office?.name,
        l.fullName,
        l.phone,
        l.email,
        l.intent,
        l.city,
        l.area,
        l.budgetMin,
        l.budgetMax,
        l.rooms?.toString(),
        l.status,
        l.temperature,
        l.assignedUser?.name,
        l.source,
      ]),
    );
  }

  async tasksCsv(): Promise<string> {
    const tasks = await this.prisma.scoped.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedUser: { select: { name: true } },
        lead: { select: { fullName: true, phone: true } },
      },
      take: 10000,
    });
    return toCsv(
      ['id', 'createdAt', 'title', 'type', 'status', 'dueAt', 'completedAt', 'assignedTo', 'leadName', 'leadPhone'],
      tasks.map((t) => [
        t.id,
        t.createdAt.toISOString(),
        t.title,
        t.type,
        t.status,
        t.dueAt?.toISOString(),
        t.completedAt?.toISOString(),
        t.assignedUser?.name,
        t.lead?.fullName,
        t.lead?.phone,
      ]),
    );
  }

  async conversationsCsv(): Promise<string> {
    const convs = await this.prisma.scoped.conversation.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        lead: { select: { fullName: true, phone: true } },
        _count: { select: { messages: true } },
      },
      take: 10000,
    });
    return toCsv(
      ['id', 'startedAt', 'endedAt', 'channel', 'status', 'handoffRequired', 'leadName', 'leadPhone', 'messages', 'summary'],
      convs.map((c) => [
        c.id,
        c.startedAt.toISOString(),
        c.endedAt?.toISOString(),
        c.channel,
        c.status,
        c.handoffRequired ? 'true' : 'false',
        c.lead?.fullName,
        c.lead?.phone,
        c._count.messages,
        c.summary,
      ]),
    );
  }
}
