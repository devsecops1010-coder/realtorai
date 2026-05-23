'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface TeamRow {
  userId: string;
  name: string;
  email: string;
  leadsAssigned: number;
  hotLeads: number;
}

/**
 * Top 5 team members by leads-assigned, with a side column showing how many
 * of those are hot. Click a row to drill into /leads filtered by that user.
 */
export function TeamLeaderboardWidget() {
  const [members, setMembers] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ members: TeamRow[] }>('/offices/current/team-stats')
      .then((r) => setMembers(r.members ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="צוות מוביל" icon={Users} iconColor="text-blue-600">
      {loading ? (
        <WidgetLoading />
      ) : members.length === 0 ? (
        <WidgetEmpty>אין נתוני צוות.</WidgetEmpty>
      ) : (
        <div className="space-y-1">
          {members.slice(0, 5).map((m, i) => (
            <Link
              key={m.userId}
              href={`/leads?assignedUserId=${m.userId}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-semibold w-5 text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="text-sm font-medium truncate">{m.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {m.hotLeads > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <Flame className="h-3 w-3" />
                    {m.hotLeads}
                  </span>
                )}
                <span className="font-semibold tabular-nums">{m.leadsAssigned}</span>
              </div>
            </Link>
          ))}
          {members.length > 5 && (
            <Link
              href="/office"
              className="block text-xs text-primary hover:underline pt-1 border-t"
            >
              כל הצוות
            </Link>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
