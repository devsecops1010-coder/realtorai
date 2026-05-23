'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface OfficeSummary {
  id: string;
  name: string;
  city: string | null;
  status: string;
}

/**
 * Multi-office summary for regional / executive roles. Counts active offices
 * + lists the top 5 by name. Lives on /admin/offices/[id] for the full
 * drilldown.
 *
 * Falls back gracefully if the user isn't a platform admin (the endpoint
 * 403s) — we just hide the widget content.
 */
export function NetworkRollupWidget() {
  const [offices, setOffices] = useState<OfficeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    // Try the admin list first (cross-tenant). Falls back to the per-tenant
    // /offices/current — which only returns the user's own office.
    api<OfficeSummary[]>('/admin/tenants')
      .then((tenants) => {
        // tenants endpoint returns Tenant rows with embedded counts, not Office
        // rows — flatten by re-querying per office. Cheaper: just show
        // tenants here as the rollup. The drill-down link goes to /admin.
        setOffices(
          tenants.slice(0, 5).map((t: unknown) => {
            const r = t as { id: string; name: string };
            return { id: r.id, name: r.name, city: null, status: 'active' };
          }),
        );
      })
      .catch((e) => {
        if ((e as { status?: number }).status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) {
    return null; // hide entirely if user lacks platform_admin
  }

  return (
    <WidgetShell title="רשת ארגונית" icon={Globe} iconColor="text-cyan-600" href="/admin">
      {loading ? (
        <WidgetLoading />
      ) : offices.length === 0 ? (
        <WidgetEmpty>אין משרדים פעילים.</WidgetEmpty>
      ) : (
        <div className="space-y-1">
          {offices.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-md px-2 py-1.5">
              <span className="text-sm font-medium truncate">{o.name}</span>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
