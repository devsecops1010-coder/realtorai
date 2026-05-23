'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface SourceRow {
  source: string;
  count: number;
}

/**
 * Lead-source breakdown for marketing. Aggregated from /reports/by-source —
 * if that endpoint isn't there yet, falls back to "—" rather than crashing.
 *
 * Today: we use /leads endpoint and aggregate client-side as a stopgap. A
 * proper endpoint will land with the marketing campaigns feature.
 */
export function MarketingKpisWidget() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Client-side aggregation off the leads endpoint. The "/leads" route
    // already paginates so we only get a sample (last 50). Good enough for
    // a visual trend.
    api<{ items: { source: string | null }[] }>('/leads?take=50')
      .then((r) => {
        const counts = new Map<string, number>();
        for (const l of r.items ?? []) {
          const key = l.source?.trim() || 'לא ידוע';
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const list = Array.from(counts.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count);
        setRows(list);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <WidgetShell title="מקורות לידים" icon={Megaphone} iconColor="text-fuchsia-600">
      {loading ? (
        <WidgetLoading />
      ) : rows.length === 0 ? (
        <WidgetEmpty>אין לידים בתקופה.</WidgetEmpty>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 5).map((r) => (
            <div key={r.source}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate">{r.source}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-fuchsia-500"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
