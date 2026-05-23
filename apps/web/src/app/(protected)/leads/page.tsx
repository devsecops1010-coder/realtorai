'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Table as TableIcon, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, TempBadge } from '@/components/leads/status-badge';
import { LeadsKanban } from '@/components/leads/leads-kanban';
import { formatDate } from '@/lib/utils';
import type { Lead, LeadStatus, LeadTemperature, Paginated } from '@/lib/types';

// Hebrew labels for the filter chip shown when arriving from a dashboard card.
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מוסמך',
  hot: 'חם',
  meeting_scheduled: 'פגישה נקבעה',
  not_relevant: 'לא רלוונטי',
  no_answer: 'אין מענה',
  opted_out: 'opted out',
  handoff_to_human: 'הועבר לאנושי',
};

const TEMP_LABELS: Record<LeadTemperature, string> = {
  cold: 'קר',
  warm: 'פושר',
  hot: 'חם',
};

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') as LeadStatus | null;
  const temperature = searchParams.get('temperature') as LeadTemperature | null;
  const assignedUserId = searchParams.get('assignedUserId');
  // URL-driven view toggle so a bookmarked Kanban stays Kanban on reload.
  const view = (searchParams.get('view') === 'kanban' ? 'kanban' : 'table') as 'kanban' | 'table';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);

  // Pull the assignee's name when filtering by user, so the chip shows a
  // human label instead of a uuid. Best-effort — falls back to id slice.
  useEffect(() => {
    if (!assignedUserId) {
      setAssigneeName(null);
      return;
    }
    api<{ name: string }>(`/users/${assignedUserId}`)
      .then((u) => setAssigneeName(u.name))
      .catch(() => setAssigneeName(null));
  }, [assignedUserId]);

  // The URL is the source of truth for filters so dashboard links land here
  // pre-filtered and the user's back-button still works. `q` (search) stays
  // local-only since it's typed reactively and we don't want it in URL noise.
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (temperature) p.set('temperature', temperature);
    if (assignedUserId) p.set('assignedUserId', assignedUserId);
    p.set('take', '100');
    return p;
  }, [status, temperature, assignedUserId]);

  async function load(search = q) {
    setLoading(true);
    try {
      const merged = new URLSearchParams(params);
      if (search) merged.set('q', search);
      const res = await api<Paginated<Lead>>(`/leads?${merged.toString()}`);
      setLeads(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const hasFilter = Boolean(status || temperature || assignedUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">לידים</h1>
        <div className="flex items-center gap-2">
          {/* Inline view switcher — preserves the rest of the URL (filters,
              search params) so toggling doesn't drop the active filter set. */}
          <div className="inline-flex rounded-md border bg-card p-0.5">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.delete('view');
                router.push(`/leads${p.toString() ? `?${p.toString()}` : ''}`);
              }}
            >
              <TableIcon className="h-3.5 w-3.5" /> טבלה
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.set('view', 'kanban');
                router.push(`/leads?${p.toString()}`);
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
          </div>
          <Button onClick={() => router.push('/leads/new')}>ליד חדש</Button>
        </div>
      </div>

      {hasFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">מסונן לפי:</span>
          {status && (
            <Badge variant="secondary" className="gap-1.5">
              סטטוס: {STATUS_LABELS[status] ?? status}
            </Badge>
          )}
          {temperature && (
            <Badge variant="secondary" className="gap-1.5">
              טמפ': {TEMP_LABELS[temperature] ?? temperature}
            </Badge>
          )}
          {assignedUserId && (
            <Badge variant="secondary" className="gap-1.5">
              מתווך: {assigneeName ?? assignedUserId.slice(0, 8)}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/leads')} className="h-7 gap-1">
            <X className="h-3 w-3" /> נקה
          </Button>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <Input placeholder="חיפוש לפי שם / טלפון / אימייל" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline">
          חיפוש
        </Button>
      </form>

      {view === 'kanban' ? (
        loading ? (
          <p className="text-center text-muted-foreground py-12">טוען...</p>
        ) : leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">אין לידים להצגה</p>
        ) : (
          <LeadsKanban
            leads={leads}
            onUpdate={(updated) =>
              // Splice the updated lead back in by id. Keeping the array
              // reference shape stable avoids re-fetching after a drop.
              setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            }
          />
        )
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>כוונה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>טמפ'</TableHead>
                <TableHead>הוקצה ל</TableHead>
                <TableHead>נוצר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    טוען...
                  </TableCell>
                </TableRow>
              )}
              {!loading && leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    אין לידים להצגה
                  </TableCell>
                </TableRow>
              )}
              {leads.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leads/${l.id}`)}
                >
                  <TableCell>
                    <Link href={`/leads/${l.id}`} className="font-medium hover:underline">
                      {l.fullName || '—'}
                    </Link>
                  </TableCell>
                  <TableCell dir="ltr">{l.phone || '—'}</TableCell>
                  <TableCell>{l.intent}</TableCell>
                  <TableCell>
                    <StatusBadge value={l.status} />
                  </TableCell>
                  <TableCell>
                    <TempBadge value={l.temperature} />
                  </TableCell>
                  <TableCell>{l.assignedUser?.name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">סה"כ: {total}</p>
    </div>
  );
}

export default function LeadsPage() {
  // useSearchParams requires a Suspense boundary in Next 15.
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <LeadsPageInner />
    </Suspense>
  );
}
