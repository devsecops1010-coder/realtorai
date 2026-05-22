'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportsToday } from '@/lib/types';

export default function DashboardPage() {
  const [report, setReport] = useState<ReportsToday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ReportsToday>('/reports/today')
      .then(setReport)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'סה"כ לידים', value: report?.counts.totalLeads, color: 'text-blue-600' },
    { label: 'לידים חדשים היום', value: report?.counts.newLeadsToday, color: 'text-amber-600' },
    { label: 'לידים חמים', value: report?.counts.hotLeads, color: 'text-rose-600' },
    { label: 'מוסמכים', value: report?.counts.qualifiedLeads, color: 'text-emerald-600' },
    { label: 'פגישות שנקבעו', value: report?.counts.meetingsScheduled, color: 'text-purple-600' },
    { label: 'משימות פתוחות', value: report?.counts.openTasks, color: 'text-orange-600' },
    { label: 'דחוף להיום', value: report?.counts.tasksDueToday, color: 'text-red-600' },
    { label: 'שיחות בהעברה', value: report?.counts.handoffConvos, color: 'text-pink-600' },
    { label: 'הודעות היום', value: report?.counts.messagesToday, color: 'text-cyan-600' },
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
