'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Paginated, Lead, Task, ConversationListItem } from '@/lib/types';

interface Counts {
  leads: number;
  newLeads: number;
  hotLeads: number;
  openTasks: number;
  handoffConvos: number;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [all, fresh, hot, openTasks, handoff] = await Promise.all([
          api<Paginated<Lead>>('/leads?take=1'),
          api<Paginated<Lead>>('/leads?status=new&take=1'),
          api<Paginated<Lead>>('/leads?temperature=hot&take=1'),
          api<Paginated<Task>>('/tasks?status=open&take=1'),
          api<Paginated<ConversationListItem>>('/conversations?handoffRequired=true&take=1'),
        ]);
        setCounts({
          leads: all.total,
          newLeads: fresh.total,
          hotLeads: hot.total,
          openTasks: openTasks.total,
          handoffConvos: handoff.total,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'סה"כ לידים', value: counts?.leads, color: 'text-blue-600' },
    { label: 'לידים חדשים', value: counts?.newLeads, color: 'text-amber-600' },
    { label: 'לידים חמים', value: counts?.hotLeads, color: 'text-rose-600' },
    { label: 'משימות פתוחות', value: counts?.openTasks, color: 'text-emerald-600' },
    { label: 'שיחות בהעברה', value: counts?.handoffConvos, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">דשבורד</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${c.color}`}>{loading ? '—' : c.value ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
