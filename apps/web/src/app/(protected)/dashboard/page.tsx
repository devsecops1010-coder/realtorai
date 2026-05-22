'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  Flame,
  Award,
  Calendar,
  ListTodo,
  AlertCircle,
  MessageSquare,
  PlusCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportsToday } from '@/lib/types';

interface StatDef {
  label: string;
  key: keyof ReportsToday['counts'];
  icon: any;
  bg: string;
  iconColor: string;
}

const STATS: StatDef[] = [
  { label: 'סה"כ לידים', key: 'totalLeads', icon: Users, bg: 'from-blue-500/15 to-blue-500/0', iconColor: 'text-blue-600' },
  { label: 'לידים חדשים היום', key: 'newLeadsToday', icon: PlusCircle, bg: 'from-amber-500/15 to-amber-500/0', iconColor: 'text-amber-600' },
  { label: 'לידים חמים', key: 'hotLeads', icon: Flame, bg: 'from-rose-500/15 to-rose-500/0', iconColor: 'text-rose-600' },
  { label: 'מוסמכים', key: 'qualifiedLeads', icon: Award, bg: 'from-emerald-500/15 to-emerald-500/0', iconColor: 'text-emerald-600' },
  { label: 'פגישות שנקבעו', key: 'meetingsScheduled', icon: Calendar, bg: 'from-violet-500/15 to-violet-500/0', iconColor: 'text-violet-600' },
  { label: 'משימות פתוחות', key: 'openTasks', icon: ListTodo, bg: 'from-orange-500/15 to-orange-500/0', iconColor: 'text-orange-600' },
  { label: 'דחוף להיום', key: 'tasksDueToday', icon: AlertCircle, bg: 'from-red-500/15 to-red-500/0', iconColor: 'text-red-600' },
  { label: 'שיחות בהעברה', key: 'handoffConvos', icon: MessageSquare, bg: 'from-pink-500/15 to-pink-500/0', iconColor: 'text-pink-600' },
  { label: 'הודעות היום', key: 'messagesToday', icon: TrendingUp, bg: 'from-cyan-500/15 to-cyan-500/0', iconColor: 'text-cyan-600' },
];

export default function DashboardPage() {
  const [report, setReport] = useState<ReportsToday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ReportsToday>('/reports/today')
      .then(setReport)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">דשבורד</h1>
        <p className="text-muted-foreground mt-1">סיכום של {today}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          const value = report?.counts[s.key];
          return (
            <Card
              key={s.key}
              className="relative overflow-hidden group hover:shadow-lift transition-all border-border/60 shadow-soft"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-100 group-hover:opacity-100 transition-opacity pointer-events-none`} />
              <CardHeader className="pb-2 relative">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-4xl font-bold tracking-tight">
                  {loading ? <span className="opacity-30">—</span> : value ?? 0}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
