'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface ProfileRow {
  id: string;
  status: string;
  leadId: string;
  lead?: { fullName: string | null } | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  needs_advisor: 'ממתין ליועץ',
  referred: 'הופנה',
  contacted_by_advisor: 'בקשר עם יועץ',
  pre_approved: 'אישור עקרוני',
  declined: 'נדחה',
  not_relevant: 'לא רלוונטי',
  unknown: 'לא ידוע',
};

/**
 * Mortgage profiles currently in flight. Best widget for mortgage_advisor —
 * lets them see their queue at a glance. Lives in mortgage-pipeline because
 * the underlying entity is MortgageProfile, not Lead.
 */
export function MortgagePipelineWidget() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ProfileRow[]>('/mortgage/profiles?status=needs_advisor,referred,contacted_by_advisor&take=6')
      .then(setProfiles)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="פרופילי משכנתא" icon={Banknote} iconColor="text-emerald-600" href="/mortgage">
      {loading ? (
        <WidgetLoading />
      ) : profiles.length === 0 ? (
        <WidgetEmpty>אין פרופילי משכנתא בטיפול.</WidgetEmpty>
      ) : (
        <div className="space-y-1.5">
          {profiles.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {p.lead?.fullName ?? 'ללא שם'}
                </p>
                <p className="text-xs text-muted-foreground">{STATUS_LABEL[p.status] ?? p.status}</p>
              </div>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
