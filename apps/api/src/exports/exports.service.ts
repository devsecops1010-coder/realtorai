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

  /**
   * Full tenant data export. Includes everything a user might reasonably
   * want to take with them when leaving:
   *   - leads + their conversations + messages + tasks
   *   - properties
   *   - mortgage profiles + referrals (consent-gated)
   *   - office + user list (without password hashes!)
   *
   * Returns a plain object — the controller serializes to JSON. We don't
   * stream because the data sizes for a single tenant fit comfortably in
   * memory; if that ever changes, switch to a streaming JSON builder.
   *
   * Sensitive fields scrubbed:
   *   - passwordHash, totpSecret, totpRecoveryCodes — never exported
   *   - refreshToken hashes — same
   */
  async fullTenantExport() {
    const [
      tenant,
      offices,
      users,
      leads,
      properties,
      tasks,
      conversations,
      mortgageProfiles,
      mortgageReferrals,
    ] = await Promise.all([
      // Tenant row read via unscoped + manual filter — the scoped extension
      // intentionally blocks Tenant queries. We grab only the fields the
      // user owns conceptually, none of the billing metadata.
      this.prisma.scoped.office.findFirst({ select: { tenantId: true } }).then((row) =>
        row
          ? this.prisma.unscoped().tenant.findUnique({
              where: { id: row.tenantId },
              select: { id: true, name: true, status: true, createdAt: true },
            })
          : null,
      ),
      this.prisma.scoped.office.findMany({
        select: {
          id: true, name: true, city: true, areas: true, phone: true,
          whatsappNumber: true, status: true, createdAt: true,
        },
      }),
      this.prisma.scoped.user.findMany({
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          status: true, officeId: true, lastLoginAt: true, createdAt: true,
        },
      }),
      this.prisma.scoped.lead.findMany({
        include: {
          assignedUser: { select: { id: true, name: true } },
        },
        take: 50_000,
      }),
      this.prisma.scoped.property.findMany({ take: 50_000 }),
      this.prisma.scoped.task.findMany({ take: 50_000 }),
      this.prisma.scoped.conversation.findMany({
        include: {
          messages: { select: { senderType: true, body: true, createdAt: true } },
        },
        take: 10_000,
      }),
      this.prisma.scoped.mortgageProfile.findMany({ take: 10_000 }),
      this.prisma.scoped.mortgageReferral.findMany({ take: 10_000 }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      note: 'Realtorai full tenant data export. Sensitive auth secrets are NOT included.',
      tenant,
      offices,
      users,
      leads,
      properties,
      tasks,
      conversations,
      mortgageProfiles,
      mortgageReferrals,
    };
  }

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
