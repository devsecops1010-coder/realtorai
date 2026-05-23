'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface UsageItem {
  tenantId: string;
  name: string;
  status: string;
  plan: string;
  byType: Record<string, { quantity: number; costEstimate: string }>;
}

/**
 * Cross-tenant monthly usage rollup. Useful for finance / platform_admin to
 * see who's burning the most LLM budget this month.
 */
export function FinanceUsageWidget() {
  const [rows, setRows] = useState<UsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api<UsageItem[]>('/admin/usage')
      .then(setRows)
      .catch((e) => {
        if ((e as { status?: number }).status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) return null;

  // Pick the top 5 by LLM cost. Falls back to first 5 if no costs reported.
  const sorted = [...rows].sort((a, b) => {
    const ca = parseFloat(a.byType.llm_tokens?.costEstimate ?? '0');
    const cb = parseFloat(b.byType.llm_tokens?.costEstimate ?? '0');
    return cb - ca;
  });

  return (
    <WidgetShell title="שימוש חודשי" icon={Activity} iconColor="text-amber-600" href="/admin">
      {loading ? (
        <WidgetLoading />
      ) : rows.length === 0 ? (
        <WidgetEmpty>אין שימוש החודש.</WidgetEmpty>
      ) : (
        <div className="space-y-1.5">
          {sorted.slice(0, 5).map((r) => {
            const llmCost = parseFloat(r.byType.llm_tokens?.costEstimate ?? '0');
            const msgQty = r.byType.whatsapp_message?.quantity ?? 0;
            return (
              <div key={r.tenantId} className="flex items-center justify-between rounded-md px-2 py-1.5">
                <span className="text-sm font-medium truncate">{r.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span dir="ltr">${llmCost.toFixed(2)}</span>
                  <span dir="ltr">{msgQty} msgs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}
