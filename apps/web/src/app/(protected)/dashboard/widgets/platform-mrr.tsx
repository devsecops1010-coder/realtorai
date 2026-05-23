'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetLoading } from './widget-shell';

interface RevenueSummary {
  mrr: number;
  tenantCount: number;
  activeTenantCount: number;
}

export function PlatformMrrWidget() {
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api<RevenueSummary>('/admin/revenue')
      .then(setData)
      .catch((e) => {
        if ((e as { status?: number }).status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) return null;

  return (
    <WidgetShell title="הכנסות פלטפורמה" icon={Banknote} iconColor="text-emerald-600" href="/admin">
      {loading ? (
        <WidgetLoading />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">לא נטען</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-3xl font-bold tabular-nums">
              ₪{data.mrr.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">לקוחות</p>
              <p className="font-semibold">{data.tenantCount}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">פעילים</p>
              <p className="font-semibold">{data.activeTenantCount}</p>
            </div>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
