'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Flame, Award, PlusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetLoading } from './widget-shell';
import type { ReportsToday } from '@/lib/types';

/**
 * 4 mini-stats: total leads, new today, hot, qualified. Clicking any cell
 * deep-links into /leads with the corresponding filter pre-applied.
 */
export function LeadsOverviewWidget() {
  const [data, setData] = useState<ReportsToday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ReportsToday>('/reports/today')
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="לידים" icon={Users}>
      {loading ? (
        <WidgetLoading />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">לא נטען</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Tile href="/leads" icon={Users} color="text-blue-600" bg="from-blue-500/10 to-transparent" label="סה״כ" value={data.counts.totalLeads} />
          <Tile href="/leads?status=new" icon={PlusCircle} color="text-amber-600" bg="from-amber-500/10 to-transparent" label="חדשים היום" value={data.counts.newLeadsToday} />
          <Tile href="/leads?temperature=hot" icon={Flame} color="text-rose-600" bg="from-rose-500/10 to-transparent" label="חמים" value={data.counts.hotLeads} />
          <Tile href="/leads?status=qualified" icon={Award} color="text-emerald-600" bg="from-emerald-500/10 to-transparent" label="מוסמכים" value={data.counts.qualifiedLeads} />
        </div>
      )}
    </WidgetShell>
  );
}

function Tile({
  href,
  icon: Icon,
  color,
  bg,
  label,
  value,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="relative rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-lift hover:-translate-y-px transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} pointer-events-none rounded-xl opacity-70 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="relative text-2xl font-bold tabular-nums tracking-tight">{value.toLocaleString()}</div>
    </Link>
  );
}
