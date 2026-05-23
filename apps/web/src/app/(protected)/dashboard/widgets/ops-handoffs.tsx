'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PhoneCall, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface ConvoRow {
  id: string;
  channel: string;
  status: string;
  handoffRequired: boolean;
  startedAt: string;
  lead: { fullName: string | null; phone: string | null } | null;
}

/**
 * Conversations currently in `handoff` (AI escalated to human). Front-and-
 * center for operations / secretary roles — the AI can't act here, only a
 * person can move them forward.
 */
export function OpsHandoffsWidget() {
  const [convos, setConvos] = useState<ConvoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: ConvoRow[] }>('/conversations?handoffRequired=true&take=6')
      .then((r) => setConvos(r.items ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell
      title="שיחות בהעברה"
      icon={PhoneCall}
      iconColor="text-rose-600"
      href="/conversations?handoffRequired=true"
    >
      {loading ? (
        <WidgetLoading />
      ) : convos.length === 0 ? (
        <WidgetEmpty>אין שיחות פתוחות בהעברה.</WidgetEmpty>
      ) : (
        <div className="space-y-1.5">
          {convos.slice(0, 5).map((c) => (
            <Link
              key={c.id}
              href={`/conversations/${c.id}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {c.lead?.fullName || c.lead?.phone || 'ללא שם'}
                </p>
                <p className="text-xs text-muted-foreground">{c.channel}</p>
              </div>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition" />
            </Link>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
