'use client';

// Pipeline funnel widget. v2 — uses the new /reports/funnel endpoint which
// returns per-status counts; we render the *live* stages as bars (with
// stage-to-stage conversion %) and tuck terminal stages into a foldable
// section so they don't fight for attention.
//
// Previous version (v1) used /reports/today + 5 hard-coded mini-stats; we
// kept that data shape elsewhere (LeadsOverviewWidget) so users still see
// quick numerics there.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface Stage {
  status: string;
  label: string;
  count: number;
}
interface Funnel {
  total: number;
  stages: Stage[];
}

// The live funnel (left-to-right pipeline). Anything outside renders as a
// terminal status in the foldable group.
const LIVE = new Set(['new', 'contacted', 'qualified', 'hot', 'meeting_scheduled']);

export function PipelineFunnelWidget() {
  const [data, setData] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Funnel>('/reports/funnel')
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
  if (!data || data.total === 0) {
    return (
      <WidgetShell title="צינור מכירות" icon={Target}>
        <WidgetEmpty>אין לידים להציג בינתיים.</WidgetEmpty>
      </WidgetShell>
    );
  }

  const live = data.stages.filter((s) => LIVE.has(s.status));
  const terminal = data.stages.filter((s) => !LIVE.has(s.status));
  const maxLive = Math.max(1, ...live.map((s) => s.count));

  return (
    <WidgetShell title="צינור מכירות" icon={Target}>
      <div className="space-y-3">
        <ul className="space-y-1.5">
          {live.map((s, i) => {
            const pct = (s.count / maxLive) * 100;
            const prev = i > 0 ? live[i - 1] : null;
            const conv = prev && prev.count > 0 ? (s.count / prev.count) * 100 : null;
            return (
              <li key={s.status}>
                <Link href={`/leads?status=${s.status}`} className="block group">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground group-hover:text-foreground">{s.label}</span>
                    <span className="tabular-nums font-medium flex items-center gap-1.5">
                      {s.count.toLocaleString()}
                      {conv !== null && (
                        <span className="text-[10px] text-muted-foreground">
                          ({conv.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-primary to-fuchsia-500 transition-all"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {terminal.some((s) => s.count > 0) && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground py-1">
              סטטוסים סופיים ({terminal.reduce((sum, s) => sum + s.count, 0)})
            </summary>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 pl-2">
              {terminal
                .filter((s) => s.count > 0)
                .map((s) => (
                  <li key={s.status} className="flex items-center justify-between">
                    <Link href={`/leads?status=${s.status}`} className="hover:text-foreground">
                      {s.label}
                    </Link>
                    <span className="tabular-nums">{s.count}</span>
                  </li>
                ))}
            </ul>
          </details>
        )}

        <Link
          href="/leads?view=kanban"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Kanban מלא <ArrowLeft className="h-3 w-3" />
        </Link>
      </div>
    </WidgetShell>
  );
}
