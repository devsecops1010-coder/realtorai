'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Home as HomeIcon,
  MessageSquare,
  AlertTriangle,
  Banknote,
  Activity,
  Flame,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/role-workspace';
import type { UserRole } from '@/lib/types';

interface PlanCatalogEntry {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string | null;
  tagline: string | null;
  monthlyPlanIls: number;
}

interface TenantDetail {
  tenant: {
    id: string;
    name: string;
    status: string;
    plan: string;
    planCatalogId: string | null;
    monthlyPlanIls: number;
    setupFeeIls: number;
    includedMessages: number;
    includedCallMinutes: number;
    monthlyLlmBudgetUsd: string;
    billingNotes: string | null;
    createdAt: string;
    suspendedAt: string | null;
    suspendedReason: string | null;
    suspendedByUserId: string | null;
    planCatalog: {
      id: string;
      slug: string;
      nameHe: string;
      nameEn: string | null;
      tagline: string | null;
    } | null;
  };
  offices: {
    id: string;
    name: string;
    city: string | null;
    whatsappNumber: string | null;
    status: string;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: 'active' | 'invited' | 'disabled';
    lastLoginAt: string | null;
  }[];
  recentLeads: {
    id: string;
    fullName: string | null;
    phone: string | null;
    status: string;
    temperature: string;
    createdAt: string;
  }[];
  recentProperties: {
    id: string;
    dealType: string;
    city: string | null;
    area: string | null;
    rooms: number | null;
    price: string | null;
    status: string;
    createdAt: string;
  }[];
  recentConversations: {
    id: string;
    channel: string;
    status: string;
    handoffRequired: boolean;
    startedAt: string;
    lead: { fullName: string | null; phone: string | null } | null;
    _count: { messages: number };
  }[];
  counts: {
    users: number;
    leads: number;
    properties: number;
    messagesLast24h: number;
    openHandoffs: number;
  };
  usageThisMonth: Record<string, { quantity: number; costEstimate: string }>;
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<TenantDetail | null>(null);
  const [plans, setPlans] = useState<PlanCatalogEntry[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [reactivateNote, setReactivateNote] = useState('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('');
  const [notifyOwner, setNotifyOwner] = useState(true);

  const reload = () =>
    api<TenantDetail>(`/admin/tenants/${id}`)
      .then(setData)
      .catch(() => setForbidden(true));

  useEffect(() => {
    const u = getCurrentUser();
    if (u?.role !== 'platform_admin' && u?.role !== 'platform_owner') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      api<TenantDetail>(`/admin/tenants/${id}`).then(setData),
      api<PlanCatalogEntry[]>('/catalog/plans').then(setPlans).catch(() => undefined),
    ])
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function doSuspend() {
    if (!suspendReason.trim()) {
      toast.error('יש להזין סיבה להשעיה');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/admin/tenants/${id}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: suspendReason, notifyOwner }),
      });
      toast.success('החשבון הושעה');
      setShowSuspend(false);
      setSuspendReason('');
      await reload();
    } catch (e) {
      toast.error(`השעיה נכשלה: ${(e as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function doReactivate() {
    setActionLoading(true);
    try {
      await api(`/admin/tenants/${id}/reactivate`, {
        method: 'PATCH',
        body: JSON.stringify({ note: reactivateNote || undefined, notifyOwner }),
      });
      toast.success('החשבון הופעל מחדש');
      setShowReactivate(false);
      setReactivateNote('');
      await reload();
    } catch (e) {
      toast.error(`הפעלה מחדש נכשלה: ${(e as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function doChangePlan() {
    if (!selectedPlanSlug) {
      toast.error('יש לבחור תוכנית');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/admin/tenants/${id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ planSlug: selectedPlanSlug }),
      });
      toast.success('התוכנית הוחלפה');
      setShowPlan(false);
      setSelectedPlanSlug('');
      await reload();
    } catch (e) {
      toast.error(`שינוי תוכנית נכשל: ${(e as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (forbidden) return <div className="text-destructive">משרד לא נמצא או אין הרשאה.</div>;
  if (loading || !data) return <div>טוען...</div>;

  const llm = data.usageThisMonth['llm_tokens'];
  const wa = data.usageThisMonth['whatsapp_message'];
  const llmCost = llm ? parseFloat(llm.costEstimate) : 0;
  const waCost = wa ? parseFloat(wa.costEstimate) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה ל-Admin
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{data.tenant.name}</h1>
            <Badge
              variant={
                data.tenant.status === 'suspended'
                  ? 'destructive'
                  : data.tenant.status === 'active'
                    ? 'success'
                    : 'outline'
              }
            >
              {data.tenant.status === 'suspended'
                ? 'מושעה'
                : data.tenant.status === 'active'
                  ? 'פעיל'
                  : data.tenant.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPlan(true)}>
              <Sparkles className="h-3.5 w-3.5 ml-1.5" />
              שינוי תוכנית
            </Button>
            {data.tenant.status === 'suspended' ? (
              <Button size="sm" onClick={() => setShowReactivate(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="h-3.5 w-3.5 ml-1.5" />
                הפעלה מחדש
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => setShowSuspend(true)}>
                <Pause className="h-3.5 w-3.5 ml-1.5" />
                השעיית חשבון
              </Button>
            )}
          </div>
        </div>
        {data.tenant.status === 'suspended' && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">חשבון מושעה</p>
                {data.tenant.suspendedReason && (
                  <p className="text-muted-foreground">{data.tenant.suspendedReason}</p>
                )}
                {data.tenant.suspendedAt && (
                  <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                    {new Date(data.tenant.suspendedAt).toLocaleString('he-IL')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suspend dialog */}
      {showSuspend && (
        <DialogShell title="השעיית חשבון" onClose={() => setShowSuspend(false)}>
          <p className="text-sm text-muted-foreground mb-3">
            כל המשתמשים של {data.tenant.name} יחסמו עד הפעלה מחדש. נתוני המשרד נשמרים.
          </p>
          <label className="text-sm font-medium block mb-1">סיבה (חובה)</label>
          <textarea
            className="w-full h-24 rounded-md border bg-background px-3 py-2 text-sm"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="לדוגמה: אי-תשלום, בקשת בעלים, חשד להפרת תנאים"
          />
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" checked={notifyOwner} onChange={(e) => setNotifyOwner(e.target.checked)} />
            שלח מייל לבעלים
          </label>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowSuspend(false)}>
              ביטול
            </Button>
            <Button variant="destructive" size="sm" disabled={actionLoading} onClick={doSuspend}>
              השעה חשבון
            </Button>
          </div>
        </DialogShell>
      )}

      {showReactivate && (
        <DialogShell title="הפעלה מחדש" onClose={() => setShowReactivate(false)}>
          <p className="text-sm text-muted-foreground mb-3">
            המשתמשים יוכלו להיכנס שוב מיד אחרי האישור.
          </p>
          <label className="text-sm font-medium block mb-1">הערה (אופציונלי)</label>
          <textarea
            className="w-full h-20 rounded-md border bg-background px-3 py-2 text-sm"
            value={reactivateNote}
            onChange={(e) => setReactivateNote(e.target.value)}
            placeholder="לדוגמה: התשלום שולם, הסתיים תהליך"
          />
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" checked={notifyOwner} onChange={(e) => setNotifyOwner(e.target.checked)} />
            שלח מייל לבעלים
          </label>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowReactivate(false)}>
              ביטול
            </Button>
            <Button size="sm" disabled={actionLoading} onClick={doReactivate} className="bg-emerald-600 hover:bg-emerald-700">
              הפעל מחדש
            </Button>
          </div>
        </DialogShell>
      )}

      {showPlan && (
        <DialogShell title="שינוי תוכנית" onClose={() => setShowPlan(false)}>
          <p className="text-sm text-muted-foreground mb-3">
            בחירת תוכנית מהקטלוג תעדכן את ערכי החיוב (חודשי, הקמה, מכסות) לפי ברירות-המחדל של התוכנית.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanSlug(p.slug)}
                className={`w-full text-right rounded-lg border p-3 transition-colors ${
                  selectedPlanSlug === p.slug
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:border-muted-foreground/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{p.nameHe}</p>
                    {p.tagline && (
                      <p className="text-xs text-muted-foreground">{p.tagline}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground" dir="ltr">
                    {p.monthlyPlanIls === 0 ? '—' : `₪${p.monthlyPlanIls.toLocaleString()}/mo`}
                  </span>
                </div>
              </button>
            ))}
            {plans.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                קטלוג ריק. הוסף תוכניות ב-/admin/catalog/plans.
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowPlan(false)}>
              ביטול
            </Button>
            <Button size="sm" disabled={actionLoading || !selectedPlanSlug} onClick={doChangePlan}>
              החל
            </Button>
          </div>
        </DialogShell>
      )}

      {/* Clickable mini-stats. Anchor-link to the matching section below.
          Same visual language as the main dashboard for muscle-memory. */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStat icon={Building2}     label="משרדים"        value={data.offices.length}          href="#offices"      color="text-blue-600"    bg="from-blue-500/15 to-blue-500/0" />
        <MiniStat icon={Users}         label="משתמשים"        value={data.counts.users}            href="#users"        color="text-violet-600"  bg="from-violet-500/15 to-violet-500/0" />
        <MiniStat icon={Activity}      label="לידים"          value={data.counts.leads}            href="#leads"        color="text-amber-600"   bg="from-amber-500/15 to-amber-500/0" />
        <MiniStat icon={HomeIcon}      label="נכסים"          value={data.counts.properties}       href="#properties"   color="text-emerald-600" bg="from-emerald-500/15 to-emerald-500/0" />
        <MiniStat icon={MessageSquare} label="הודעות 24ש"     value={data.counts.messagesLast24h}  href="#conversations" color="text-cyan-600"    bg="from-cyan-500/15 to-cyan-500/0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              חיוב ותוכנית
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV
              label="תוכנית"
              value={data.tenant.planCatalog ? data.tenant.planCatalog.nameHe : data.tenant.plan}
            />
            <KV label="חודשי" value={`₪${data.tenant.monthlyPlanIls.toLocaleString()}`} />
            <KV label="הקמה" value={`₪${data.tenant.setupFeeIls.toLocaleString()}`} />
            <KV label="הודעות כלולות" value={data.tenant.includedMessages || 'ללא הגבלה'} />
            <KV label="דקות שיחה כלולות" value={data.tenant.includedCallMinutes || 'ללא הגבלה'} />
            <KV label="תקציב LLM חודשי" value={`$${data.tenant.monthlyLlmBudgetUsd === '0' ? '∞' : data.tenant.monthlyLlmBudgetUsd}`} />
            {data.tenant.billingNotes && (
              <div className="pt-2 border-t mt-2 text-muted-foreground text-xs">
                {data.tenant.billingNotes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              שימוש החודש
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV label="טוקני LLM" value={(llm?.quantity ?? 0).toLocaleString()} />
            <KV label="עלות LLM" value={`$${llmCost.toFixed(4)}`} />
            <KV label="הודעות WhatsApp" value={(wa?.quantity ?? 0).toLocaleString()} />
            <KV label="עלות WhatsApp" value={`$${waCost.toFixed(4)}`} />
            <KV label="סה״כ עלות מוערכת" value={`$${(llmCost + waCost).toFixed(4)}`} />
            {data.counts.openHandoffs > 0 && (
              <div className="pt-2 mt-2 border-t flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                {data.counts.openHandoffs} שיחות פתוחות בהעברה
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drilldown sections — each anchored so the mini-stats can scroll to it */}

      <Card id="offices">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            סניפים ({data.offices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.offices.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">אין סניפים.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>עיר</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.offices.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer group hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/admin/offices/${o.id}`)}
                  >
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.city || '—'}</TableCell>
                    <TableCell dir="ltr">{o.whatsappNumber || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === 'active' ? 'success' : 'outline'}>{o.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="users">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            משתמשים ({data.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.users.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">אין משתמשים.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>תפקיד</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>התחברות אחרונה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : u.status === 'invited' ? 'outline' : 'secondary'}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('he-IL') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="leads">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-600" />
            לידים אחרונים ({data.recentLeads.length} מתוך {data.counts.leads})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentLeads.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">אין לידים.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>טמפ'</TableHead>
                  <TableHead>נוצר</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentLeads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.fullName || '—'}</TableCell>
                    <TableCell dir="ltr">{l.phone || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    <TableCell>
                      {l.temperature === 'hot' ? (
                        <Badge variant="hot" className="gap-1">
                          <Flame className="h-3 w-3" /> חם
                        </Badge>
                      ) : (
                        <Badge variant={l.temperature === 'warm' ? 'warning' : 'cold'}>{l.temperature}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {new Date(l.createdAt).toLocaleString('he-IL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="properties">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HomeIcon className="h-5 w-5 text-emerald-600" />
            נכסים אחרונים ({data.recentProperties.length} מתוך {data.counts.properties})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentProperties.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">אין נכסים.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>עסקה</TableHead>
                  <TableHead>עיר/אזור</TableHead>
                  <TableHead>חדרים</TableHead>
                  <TableHead>מחיר</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>נוצר</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentProperties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.dealType === 'sale' ? 'מכירה' : 'השכרה'}</TableCell>
                    <TableCell>{[p.city, p.area].filter(Boolean).join(' / ') || '—'}</TableCell>
                    <TableCell className="tabular-nums">{p.rooms ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">
                      {p.price ? `₪${parseFloat(p.price).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {new Date(p.createdAt).toLocaleString('he-IL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="conversations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-600" />
            שיחות מהיומיים האחרונים ({data.recentConversations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentConversations.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">אין שיחות פעילות ב-24 השעות.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ליד</TableHead>
                  <TableHead>ערוץ</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>הודעות</TableHead>
                  <TableHead>דרושה העברה?</TableHead>
                  <TableHead>התחילה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentConversations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.lead?.fullName || c.lead?.phone || '—'}
                    </TableCell>
                    <TableCell>{c.channel}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'handoff' ? 'destructive' : 'default'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{c._count.messages}</TableCell>
                    <TableCell>{c.handoffRequired ? '⚠️ כן' : 'לא'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {new Date(c.startedAt).toLocaleString('he-IL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  href,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      scroll
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="relative overflow-hidden h-full hover:shadow-lift hover:-translate-y-0.5 hover:border-primary/40 transition-all border-border/60 shadow-soft cursor-pointer">
        <div className={`absolute inset-0 bg-gradient-to-br ${bg} opacity-100 pointer-events-none`} />
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Tiny inline dialog. The shadcn/ui Dialog component requires Portal +
 * focus-trap which isn't worth adding here for 3 admin-only popovers.
 */
function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-background border shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="סגירה"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
