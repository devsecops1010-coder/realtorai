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
  Activity,
  Flame,
  Phone,
  MessageCircle,
  MapPin,
  AlertTriangle,
  Pause,
  Play,
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

interface OfficeDetail {
  office: {
    id: string;
    name: string;
    city: string | null;
    areas: string[];
    phone: string | null;
    whatsappNumber: string | null;
    status: string;
    inactivatedAt: string | null;
    inactivatedReason: string | null;
    inactivatedByUserId: string | null;
    createdAt: string;
    tenant: { id: string; name: string; plan: string; status: string };
    areaLinks?: { areaId: string; area: { id: string; slug: string; nameHe: string; region: string | null } }[];
  };
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

export default function OfficeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<OfficeDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const reload = () =>
    api<OfficeDetail>(`/admin/offices/${id}`)
      .then(setData)
      .catch(() => setForbidden(true));

  useEffect(() => {
    const u = getCurrentUser();
    if (u?.role !== 'platform_admin' && u?.role !== 'platform_owner') {
      router.replace('/dashboard');
      return;
    }
    api<OfficeDetail>(`/admin/offices/${id}`)
      .then(setData)
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function doDeactivate() {
    if (!deactivateReason.trim()) {
      toast.error('יש להזין סיבה');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/admin/offices/${id}/deactivate`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: deactivateReason }),
      });
      toast.success('הסניף הושבת');
      setShowDeactivate(false);
      setDeactivateReason('');
      await reload();
    } catch (e) {
      toast.error(`השבתה נכשלה: ${(e as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function doReactivate() {
    setActionLoading(true);
    try {
      await api(`/admin/offices/${id}/reactivate`, { method: 'PATCH' });
      toast.success('הסניף הופעל');
      await reload();
    } catch (e) {
      toast.error(`הפעלה נכשלה: ${(e as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (forbidden) return <div className="text-destructive">סניף לא נמצא או אין הרשאה.</div>;
  if (loading || !data) return <div>טוען...</div>;

  const llm = data.usageThisMonth['llm_tokens'];
  const wa = data.usageThisMonth['whatsapp_message'];
  const llmCost = llm ? parseFloat(llm.costEstimate) : 0;
  const waCost = wa ? parseFloat(wa.costEstimate) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/tenants/${data.office.tenant.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה ל-{data.office.tenant.name}
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.office.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              שייך ל-
              <Link href={`/admin/tenants/${data.office.tenant.id}`} className="underline hover:text-foreground">
                {data.office.tenant.name}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                data.office.status === 'inactive'
                  ? 'destructive'
                  : data.office.status === 'active'
                    ? 'success'
                    : 'outline'
              }
            >
              {data.office.status === 'inactive'
                ? 'מושבת'
                : data.office.status === 'active'
                  ? 'פעיל'
                  : data.office.status}
            </Badge>
            {data.office.status === 'inactive' ? (
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={doReactivate}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="h-3.5 w-3.5 ml-1.5" />
                הפעלת סניף
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => setShowDeactivate(true)}>
                <Pause className="h-3.5 w-3.5 ml-1.5" />
                השבתת סניף
              </Button>
            )}
          </div>
        </div>
        {data.office.status === 'inactive' && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">סניף מושבת</p>
                {data.office.inactivatedReason && (
                  <p className="text-muted-foreground">{data.office.inactivatedReason}</p>
                )}
                {data.office.inactivatedAt && (
                  <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                    {new Date(data.office.inactivatedAt).toLocaleString('he-IL')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeactivate(false)}>
          <div
            className="w-full max-w-md rounded-xl bg-background border shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">השבתת סניף</h2>
              <button
                type="button"
                onClick={() => setShowDeactivate(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="סגירה"
              >×</button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              המשתמשים של הסניף יחסמו מיד. סניפים אחרים באותו tenant ימשיכו לעבוד כרגיל.
            </p>
            <label className="text-sm font-medium block mb-1">סיבה (חובה)</label>
            <textarea
              className="w-full h-24 rounded-md border bg-background px-3 py-2 text-sm"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="לדוגמה: סגירת הסניף, מעבר משרד, שינוי ארגוני"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowDeactivate(false)}>
                ביטול
              </Button>
              <Button variant="destructive" size="sm" disabled={actionLoading} onClick={doDeactivate}>
                השבת סניף
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Office info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            פרטי הסניף
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoTile icon={MapPin} label="עיר" value={data.office.city || '—'} />
          <InfoTile icon={Phone} label="טלפון" value={data.office.phone || '—'} dir="ltr" />
          <InfoTile icon={MessageCircle} label="WhatsApp" value={data.office.whatsappNumber || '—'} dir="ltr" />
          <InfoTile icon={Building2} label="סטטוס" value={data.office.status} />
          {data.office.areas.length > 0 && (
            <div className="col-span-2 md:col-span-4 mt-2">
              <p className="text-xs text-muted-foreground mb-1">אזורי פעילות</p>
              <div className="flex flex-wrap gap-1.5">
                {data.office.areas.map((a) => (
                  <Badge key={a} variant="secondary" className="font-normal">{a}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clickable mini-stats — anchor down to matching section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStat icon={Users}         label="משתמשים"        value={data.counts.users}            href="#users"        color="text-violet-600"  bg="from-violet-500/15 to-violet-500/0" />
        <MiniStat icon={Activity}      label="לידים"          value={data.counts.leads}            href="#leads"        color="text-amber-600"   bg="from-amber-500/15 to-amber-500/0" />
        <MiniStat icon={HomeIcon}      label="נכסים"          value={data.counts.properties}       href="#properties"   color="text-emerald-600" bg="from-emerald-500/15 to-emerald-500/0" />
        <MiniStat icon={MessageSquare} label="הודעות 24ש"     value={data.counts.messagesLast24h}  href="#conversations" color="text-cyan-600"    bg="from-cyan-500/15 to-cyan-500/0" />
        <MiniStat icon={AlertTriangle} label="העברות פתוחות"  value={data.counts.openHandoffs}     href="#conversations" color="text-rose-600"    bg="from-rose-500/15 to-rose-500/0" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            שימוש החודש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KVTile label="טוקני LLM" value={(llm?.quantity ?? 0).toLocaleString()} />
            <KVTile label="עלות LLM" value={`$${llmCost.toFixed(4)}`} />
            <KVTile label="הודעות WhatsApp" value={(wa?.quantity ?? 0).toLocaleString()} />
            <KVTile label="עלות WhatsApp" value={`$${waCost.toFixed(4)}`} />
          </div>
        </CardContent>
      </Card>

      <Card id="users">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            משתמשים בסניף ({data.users.length})
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
                    <TableCell><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></TableCell>
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
            שיחות אחרונות ({data.recentConversations.length})
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

function InfoTile({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  dir?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="font-medium" dir={dir}>
        {value}
      </p>
    </div>
  );
}

function KVTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
