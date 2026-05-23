'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  ArrowLeft,
  Building2,
  Banknote,
  ClipboardCheck,
  Megaphone,
  ShieldCheck,
  PhoneCall,
  BarChart3,
  Eye,
  Target,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getWorkspaceForRole,
  ROLE_LABELS,
  type WorkspaceKind,
} from '@/lib/role-workspace';
import type { AuthUser, ReportsToday } from '@/lib/types';
import { WORKSPACE_WIDGETS } from './layouts';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

interface StatDef {
  label: string;
  key: keyof ReportsToday['counts'];
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  iconColor: string;
  href: string;
}

interface ActionDef {
  title: string;
  body: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const STATS: StatDef[] = [
  { label: 'סה"כ לידים', key: 'totalLeads', icon: Users, bg: 'from-blue-500/15 to-blue-500/0', iconColor: 'text-blue-600', href: '/leads' },
  { label: 'לידים חדשים היום', key: 'newLeadsToday', icon: PlusCircle, bg: 'from-amber-500/15 to-amber-500/0', iconColor: 'text-amber-600', href: '/leads?status=new' },
  { label: 'לידים חמים', key: 'hotLeads', icon: Flame, bg: 'from-rose-500/15 to-rose-500/0', iconColor: 'text-rose-600', href: '/leads?temperature=hot' },
  { label: 'מוסמכים', key: 'qualifiedLeads', icon: Award, bg: 'from-emerald-500/15 to-emerald-500/0', iconColor: 'text-emerald-600', href: '/leads?status=qualified' },
  { label: 'פגישות שנקבעו', key: 'meetingsScheduled', icon: Calendar, bg: 'from-violet-500/15 to-violet-500/0', iconColor: 'text-violet-600', href: '/leads?status=meeting_scheduled' },
  { label: 'משימות פתוחות', key: 'openTasks', icon: ListTodo, bg: 'from-orange-500/15 to-orange-500/0', iconColor: 'text-orange-600', href: '/tasks?status=open' },
  { label: 'דחוף להיום', key: 'tasksDueToday', icon: AlertCircle, bg: 'from-red-500/15 to-red-500/0', iconColor: 'text-red-600', href: '/tasks?status=open&due=today' },
  { label: 'שיחות בהעברה', key: 'handoffConvos', icon: MessageSquare, bg: 'from-pink-500/15 to-pink-500/0', iconColor: 'text-pink-600', href: '/conversations?handoffRequired=true' },
  { label: 'הודעות היום', key: 'messagesToday', icon: TrendingUp, bg: 'from-cyan-500/15 to-cyan-500/0', iconColor: 'text-cyan-600', href: '/conversations' },
];

const ROLE_STATS: Record<WorkspaceKind, Array<keyof ReportsToday['counts']>> = {
  platform: ['messagesToday', 'handoffConvos', 'newLeadsToday', 'openTasks', 'totalLeads'],
  executive: ['totalLeads', 'newLeadsToday', 'hotLeads', 'meetingsScheduled', 'messagesToday'],
  regional: ['newLeadsToday', 'hotLeads', 'meetingsScheduled', 'handoffConvos', 'openTasks'],
  officeLeadership: ['newLeadsToday', 'hotLeads', 'meetingsScheduled', 'tasksDueToday', 'handoffConvos'],
  teamLead: ['hotLeads', 'tasksDueToday', 'openTasks', 'meetingsScheduled', 'handoffConvos'],
  sales: ['hotLeads', 'tasksDueToday', 'meetingsScheduled', 'handoffConvos', 'newLeadsToday'],
  mortgage: ['qualifiedLeads', 'hotLeads', 'tasksDueToday', 'handoffConvos', 'messagesToday'],
  marketing: ['newLeadsToday', 'totalLeads', 'messagesToday', 'meetingsScheduled', 'hotLeads'],
  operations: ['handoffConvos', 'tasksDueToday', 'newLeadsToday', 'messagesToday', 'openTasks'],
  finance: ['totalLeads', 'newLeadsToday', 'messagesToday', 'openTasks', 'meetingsScheduled'],
  viewer: ['totalLeads', 'hotLeads', 'meetingsScheduled', 'messagesToday', 'openTasks'],
};

const ROLE_ACTIONS: Record<WorkspaceKind, ActionDef[]> = {
  platform: [
    { title: 'פיקוח פלטפורמה', body: 'משרדים, שימוש ובריאות מערכת', href: '/admin', icon: ShieldCheck, color: 'text-slate-700' },
    { title: 'משרדים פעילים', body: 'מעקב אחרי פעילות לקוחות', href: '/office', icon: Building2, color: 'text-teal-700' },
    { title: 'שיחות בהעברה', body: 'מקומות שבהם AI צריך אדם', href: '/conversations?handoffRequired=true', icon: PhoneCall, color: 'text-rose-600' },
  ],
  executive: [
    { title: 'תמונת ביצועים', body: 'לידים, פגישות ושיחות היום', href: '/dashboard', icon: BarChart3, color: 'text-cyan-700' },
    { title: 'צוותים והרשאות', body: 'מבנה ארגוני ותפקידים', href: '/team', icon: Users, color: 'text-blue-700' },
    { title: 'צינור מכירות', body: 'לידים חמים ופגישות', href: '/leads?temperature=hot', icon: Target, color: 'text-rose-600' },
  ],
  regional: [
    { title: 'לידים תקועים', body: 'שיחות בהעברה ומשימות פתוחות', href: '/conversations?handoffRequired=true', icon: AlertCircle, color: 'text-amber-700' },
    { title: 'ביצועי צוות', body: 'השוואת עומסים ותפקידים', href: '/office', icon: Users, color: 'text-blue-700' },
    { title: 'פגישות שנקבעו', body: 'מדד התקדמות יומי', href: '/leads?status=meeting_scheduled', icon: Calendar, color: 'text-violet-700' },
  ],
  officeLeadership: [
    { title: 'ניהול לידים חמים', body: 'הזדמנויות שדורשות טיפול', href: '/leads?temperature=hot', icon: Flame, color: 'text-rose-600' },
    { title: 'ביצועי צוות', body: 'עומסים לפי משתמש ותפקיד', href: '/office', icon: Users, color: 'text-teal-700' },
    { title: 'גיוס נכסים', body: 'נכסים ובעלי דירות', href: '/properties', icon: Building2, color: 'text-emerald-700' },
  ],
  teamLead: [
    { title: 'משימות להיום', body: 'פולו-אפים ותיאומים קרובים', href: '/tasks?status=open&due=today', icon: ListTodo, color: 'text-orange-700' },
    { title: 'לידים חמים', body: 'חלוקה וטיפול מהיר', href: '/leads?temperature=hot', icon: Flame, color: 'text-rose-600' },
    { title: 'שיחות בהעברה', body: 'מקומות שבהם הצוות צריך להיכנס', href: '/conversations?handoffRequired=true', icon: MessageSquare, color: 'text-cyan-700' },
  ],
  sales: [
    { title: 'הלקוחות החמים שלי', body: 'לידים עם סיכוי גבוה לפגישה', href: '/leads?temperature=hot', icon: Flame, color: 'text-rose-600' },
    { title: 'משימות להיום', body: 'פולו-אפים שלא מחכים למחר', href: '/tasks?status=open&due=today', icon: ClipboardCheck, color: 'text-orange-700' },
    { title: 'שיחות פתוחות', body: 'לקוחות שממתינים למענה אנושי', href: '/conversations?handoffRequired=true', icon: PhoneCall, color: 'text-cyan-700' },
  ],
  mortgage: [
    { title: 'תיקי משכנתא', body: 'לקוחות שצריכים בדיקת מימון', href: '/mortgage', icon: Banknote, color: 'text-emerald-700' },
    { title: 'יועצים והפניות', body: 'ניהול הפניות ליועצים', href: '/mortgage/advisors', icon: Users, color: 'text-teal-700' },
    { title: 'לידים מוסמכים', body: 'לקוחות מוכנים לבדיקה', href: '/leads?status=qualified', icon: Award, color: 'text-blue-700' },
  ],
  marketing: [
    { title: 'לידים חדשים', body: 'מקורות כניסה וקמפיינים', href: '/leads?status=new', icon: Megaphone, color: 'text-rose-700' },
    { title: 'נכסים לפרסום', body: 'מלאי נכסים פעילים', href: '/properties', icon: Building2, color: 'text-emerald-700' },
    { title: 'שיחות מהקמפיינים', body: 'תגובות שהגיעו היום', href: '/conversations', icon: MessageSquare, color: 'text-cyan-700' },
  ],
  operations: [
    { title: 'שיחות בהעברה', body: 'לקוחות שמחכים לאדם', href: '/conversations?handoffRequired=true', icon: MessageSquare, color: 'text-cyan-700' },
    { title: 'לידים חדשים', body: 'כניסות שצריך לסדר ולשייך', href: '/leads?status=new', icon: PlusCircle, color: 'text-amber-700' },
    { title: 'משימות פתוחות', body: 'תיאומים, שיחות ופולו-אפים', href: '/tasks?status=open', icon: ListTodo, color: 'text-orange-700' },
  ],
  finance: [
    { title: 'דוחות פעילות', body: 'נתוני משרד לייצוא ובקרה', href: '/dashboard', icon: BarChart3, color: 'text-slate-700' },
    { title: 'מבט משרד', body: 'משתמשים, פעילות ותפקידים', href: '/office', icon: Building2, color: 'text-teal-700' },
    { title: 'הרשאות', body: 'מי רשאי לראות נתונים כספיים', href: '/team/permissions', icon: ShieldCheck, color: 'text-amber-700' },
  ],
  viewer: [
    { title: 'מעקב לידים', body: 'סטטוס פעילות בלי פעולות עריכה', href: '/leads', icon: Eye, color: 'text-slate-700' },
    { title: 'נכסים', body: 'מלאי משרד ותנועה', href: '/properties', icon: Building2, color: 'text-emerald-700' },
    { title: 'התראות', body: 'אירועים אחרונים במשרד', href: '/notifications', icon: AlertCircle, color: 'text-amber-700' },
  ],
};

export default function DashboardPage() {
  const [report, setReport] = useState<ReportsToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    api<ReportsToday>('/reports/today')
      .then(setReport)
      .finally(() => setLoading(false));
  }, []);

  const workspace = getWorkspaceForRole(user?.role);
  const stats = useMemo(
    () => ROLE_STATS[workspace.kind].map((key) => STATS.find((s) => s.key === key)).filter(Boolean) as StatDef[],
    [workspace.kind],
  );
  const actions = ROLE_ACTIONS[workspace.kind];

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const counts = report?.counts;
  const urgentScore =
    (counts?.handoffConvos ?? 0) + (counts?.tasksDueToday ?? 0) + (counts?.hotLeads ?? 0);

  const priorityQueue = [
    {
      label: 'שיחות בהעברה',
      body: 'כניסה אנושית',
      key: 'handoffConvos' as keyof ReportsToday['counts'],
      href: '/conversations?handoffRequired=true',
      icon: MessageSquare,
      color: 'text-cyan-700',
    },
    {
      label: 'דחוף להיום',
      body: 'משימות פתוחות',
      key: 'tasksDueToday' as keyof ReportsToday['counts'],
      href: '/tasks?status=open&due=today',
      icon: AlertCircle,
      color: 'text-red-600',
    },
    {
      label: 'לידים חמים',
      body: 'סיכוי גבוה לפגישה',
      key: 'hotLeads' as keyof ReportsToday['counts'],
      href: '/leads?temperature=hot',
      icon: Flame,
      color: 'text-rose-600',
    },
    {
      label: 'חדשים היום',
      body: 'ממתינים לסינון',
      key: 'newLeadsToday' as keyof ReportsToday['counts'],
      href: '/leads?status=new',
      icon: PlusCircle,
      color: 'text-amber-700',
    },
  ];

  const workflowSteps = [
    { label: 'מיקוד', body: workspace.scope },
    { label: 'פעולה', body: actions[0]?.title ?? 'משימה מרכזית' },
    { label: 'מעקב', body: actions[1]?.title ?? 'פולו-אפ' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* First-run wizard — self-gates via localStorage so re-renders are a no-op. */}
      {user && <OnboardingWizard user={user} />}
      <section className="overflow-hidden rounded-lg border bg-card shadow-soft">
        <div className={cn('h-1 bg-gradient-to-l', workspace.tone)} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{workspace.label}</Badge>
              <span className="text-sm text-muted-foreground">{today}</span>
            </div>
            <h1 className="mt-4 max-w-4xl text-2xl font-bold tracking-tight md:text-3xl">
              {user?.name ? `${user.name}, ${workspace.headline}` : workspace.headline}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{workspace.focus}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <WorkspaceSignal label="תפקיד" value={user?.role ? ROLE_LABELS[user.role] : 'צופה'} />
              <WorkspaceSignal label="היקף" value={workspace.scope} />
              <WorkspaceSignal label="דחיפות" value={loading ? '...' : urgentScore.toString()} />
            </div>
          </div>

          <aside className="border-t bg-muted/40 p-5 lg:border-r lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">תור עבודה עכשיו</h2>
              <Badge variant={urgentScore > 0 ? 'destructive' : 'outline'}>
                {loading ? '...' : urgentScore}
              </Badge>
            </div>
            <div className="space-y-2">
              {priorityQueue.map((item) => (
                <QueueItem
                  key={item.key}
                  item={item}
                  loading={loading}
                  value={report?.counts[item.key]}
                />
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">פעולות לפי תפקיד</h2>
            <p className="text-sm text-muted-foreground">הכניסות המרכזיות לעבודה היומית</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {actions.map((action) => (
              <ActionTile key={action.title} action={action} />
            ))}
          </div>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">רצף יום</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflowSteps.map((step, index) => (
              <WorkflowStep key={step.label} index={index + 1} label={step.label} body={step.body} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">מדדים לתפקיד שלך</h2>
            <p className="text-sm text-muted-foreground">מספרים שצריך לראות לפני שממשיכים</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatCard key={s.key} stat={s} value={report?.counts[s.key]} loading={loading} />
          ))}
        </div>
      </section>

      {/* Role-specific widgets — each one is self-contained and renders only
          if the user has access (403s from the API hide it automatically). */}
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-bold">לוח התפקיד שלך</h2>
          <p className="text-sm text-muted-foreground">המידע שמתאים ל-{workspace.label}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(WORKSPACE_WIDGETS[workspace.kind] ?? []).map((w) => (
            <div key={w.key} className={w.fullWidth ? 'md:col-span-2' : undefined}>
              <w.Component />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionTile({ action }: { action: ActionDef }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className="group rounded-lg border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{action.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.body}</p>
        </div>
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-muted">
          <Icon className={cn('h-5 w-5', action.color)} />
        </div>
      </div>
      <ArrowLeft className="mt-4 h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-[-2px] group-hover:text-primary" />
    </Link>
  );
}

function QueueItem({
  item,
  value,
  loading,
}: {
  item: {
    label: string;
    body: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };
  value: number | undefined;
  loading: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 transition-colors hover:border-primary/40"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-muted">
          <Icon className={cn('h-4 w-4', item.color)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="truncate text-xs text-muted-foreground">{item.body}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums">{loading ? '-' : value ?? 0}</span>
        <ArrowLeft className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-[-2px] group-hover:text-primary" />
      </div>
    </Link>
  );
}

function WorkflowStep({ index, label, body }: { index: number; label: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function StatCard({ stat, value, loading }: { stat: StatDef; value: number | undefined; loading: boolean }) {
  const Icon = stat.icon;
  return (
    <Link
      href={stat.href}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
    >
      <Card className="relative overflow-hidden h-full hover:shadow-lift hover:-translate-y-0.5 hover:border-primary/40 transition-all border-border/60 shadow-soft cursor-pointer">
        <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-100 pointer-events-none`} />
        <CardHeader className="pb-2 relative">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            <Icon className={`h-5 w-5 ${stat.iconColor} flex-shrink-0`} />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end justify-between">
            <div className="text-4xl font-bold tracking-tight">
              {loading ? <span className="opacity-30">-</span> : value ?? 0}
            </div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function WorkspaceSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
