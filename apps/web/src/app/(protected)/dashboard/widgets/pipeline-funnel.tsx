'use client';

import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';
import type { ReportsToday } from '@/lib/types';

/**
 * Visual lead funnel. Each row shows a stage + count + a filled bar relative
 * to the widest stage. Click drills into /leads pre-filtered for that stage.
 *
 * Data pulled from /reports/today — same source as the existing stats grid,
 * so the page only does one network round-trip.
 */
export function PipelineFunnelWidget() {
  const [data, setData] = useState<ReportsToday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ReportsToday>('/reports/today')
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <WidgetShell title="צינור מכירות" icon={Target}>
        <WidgetLoading />
      </WidgetShell>
    );
  }
  if (!data) {
    return (
      <WidgetShell title="צינור מכירות" icon={Target}>
        <WidgetEmpty>אין נתונים.</WidgetEmpty>
      </WidgetShell>
    );
  }

  const stages = [
    { key: 'totalLeads', label: 'סה״כ לידים', value: data.counts.totalLeads, href: '/leads', color: 'bg-blue-500' },
    { key: 'newLeadsToday', label: 'חדשים היום', value: data.counts.newLeadsToday, href: '/leads?status=new', color: 'bg-amber-500' },
    { key: 'qualifiedLeads', label: 'מוסמכים', value: data.counts.qualifiedLeads, href: '/leads?status=qualified', color: 'bg-emerald-500' },
    { key: 'hotLeads', label: 'חמים', value: data.counts.hotLeads, href: '/leads?temperature=hot', color: 'bg-rose-500' },
    { key: 'meetingsScheduled', label: 'פגישות', value: data.counts.meetingsScheduled, href: '/leads?status=meeting_scheduled', color: 'bg-violet-500' },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <WidgetShell title="צינור מכירות" icon={Target}>
      <div className="space-y-2">
        {stages.map((s) => {
          const pct = Math.round((s.value / max) * 100);
          return (
            <a key={s.key} href={s.href} className="block group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{s.value.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${s.color} group-hover:opacity-80 transition`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </a>
          );
        })}
      </div>
    </WidgetShell>
  );
}
