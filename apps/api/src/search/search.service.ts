import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchHit {
  type: 'lead' | 'property' | 'task' | 'conversation' | 'user';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/**
 * Global search service. Runs 5 parallel substring queries (one per entity)
 * and returns a flat list of hits the UI can render straight to a result
 * list.
 *
 * Why not full-text search (e.g. Postgres tsvector): the data volumes per
 * tenant are small (thousands of leads, not millions), and Postgres'
 * `contains` with `mode: insensitive` benchmarks under 5ms on indexed
 * columns. Adding tsvector + GIN indexes + ranking is overkill until we
 * see >100k rows per tenant.
 *
 * Each query is wrapped in a try/catch on the caller so a single failing
 * entity (e.g. permissions-denied for one role) doesn't blank out the
 * whole search.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(rawQuery: string, perType = 5): Promise<SearchHit[]> {
    const q = rawQuery.trim();
    if (q.length < 2) return [];

    const [leads, properties, tasks, conversations, users] = await Promise.all([
      this.searchLeads(q, perType).catch(() => []),
      this.searchProperties(q, perType).catch(() => []),
      this.searchTasks(q, perType).catch(() => []),
      this.searchConversations(q, perType).catch(() => []),
      this.searchUsers(q, perType).catch(() => []),
    ]);

    return [...leads, ...properties, ...tasks, ...conversations, ...users];
  }

  private async searchLeads(q: string, take: number): Promise<SearchHit[]> {
    const rows = await this.prisma.scoped.lead.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { id: true, fullName: true, phone: true, status: true, city: true },
    });
    return rows.map((r) => ({
      type: 'lead' as const,
      id: r.id,
      title: r.fullName || r.phone || 'ליד ללא שם',
      subtitle: [r.phone, r.city, r.status].filter(Boolean).join(' · ') || null,
      href: `/leads/${r.id}`,
    }));
  }

  private async searchProperties(q: string, take: number): Promise<SearchHit[]> {
    const rows = await this.prisma.scoped.property.findMany({
      where: {
        OR: [
          { street: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { area: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { id: true, street: true, city: true, area: true, rooms: true, price: true, dealType: true },
    });
    return rows.map((r) => ({
      type: 'property' as const,
      id: r.id,
      title: r.street ? `${r.street}, ${r.city ?? ''}` : `${r.dealType === 'sale' ? 'מכירה' : 'השכרה'} · ${r.city ?? '—'}`,
      subtitle: [r.area, r.rooms ? `${r.rooms} חד'` : null, r.price ? `₪${Number(r.price).toLocaleString()}` : null]
        .filter(Boolean)
        .join(' · ') || null,
      href: `/properties/${r.id}`,
    }));
  }

  private async searchTasks(q: string, take: number): Promise<SearchHit[]> {
    const rows = await this.prisma.scoped.task.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { dueAt: 'asc' },
      take,
      select: { id: true, title: true, status: true, dueAt: true, leadId: true },
    });
    return rows.map((r) => ({
      type: 'task' as const,
      id: r.id,
      title: r.title,
      subtitle: [r.status, r.dueAt ? new Date(r.dueAt).toLocaleDateString('he-IL') : null].filter(Boolean).join(' · ') || null,
      // Tasks don't have their own detail page — link to the parent lead if
      // there is one, otherwise to the tasks list filtered to this task.
      href: r.leadId ? `/leads/${r.leadId}` : `/tasks`,
    }));
  }

  private async searchConversations(q: string, take: number): Promise<SearchHit[]> {
    const rows = await this.prisma.scoped.conversation.findMany({
      where: {
        OR: [
          { summary: { contains: q, mode: 'insensitive' } },
          // Conversations don't have a body field of their own — the
          // messages do. We search the message body via a relation filter.
          { messages: { some: { body: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      orderBy: { startedAt: 'desc' },
      take,
      select: {
        id: true,
        channel: true,
        status: true,
        summary: true,
        startedAt: true,
        lead: { select: { fullName: true, phone: true } },
      },
    });
    return rows.map((r) => ({
      type: 'conversation' as const,
      id: r.id,
      title: r.lead?.fullName || r.lead?.phone || 'שיחה',
      subtitle: [r.channel, r.status, r.summary?.slice(0, 60)].filter(Boolean).join(' · ') || null,
      href: `/conversations/${r.id}`,
    }));
  }

  private async searchUsers(q: string, take: number): Promise<SearchHit[]> {
    const rows = await this.prisma.scoped.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { name: 'asc' },
      take,
      select: { id: true, name: true, email: true, role: true },
    });
    return rows.map((r) => ({
      type: 'user' as const,
      id: r.id,
      title: r.name,
      subtitle: [r.email, r.role].filter(Boolean).join(' · ') || null,
      // Users don't have a per-user route yet; link to the team page.
      href: `/team`,
    }));
  }
}
