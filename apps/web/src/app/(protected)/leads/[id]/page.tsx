'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, TempBadge } from '@/components/leads/status-badge';
import { SignatureRequestsCard } from '@/components/sign/signature-requests-card';
import { formatDate } from '@/lib/utils';
import type { Lead, LeadStatus, LeadTemperature } from '@/lib/types';

interface LeadDetail extends Lead {
  conversations: {
    id: string;
    channel: string;
    status: string;
    startedAt: string;
    summary: string | null;
    handoffRequired: boolean;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
  }[];
}

const statuses: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'hot',
  'meeting_scheduled',
  'not_relevant',
  'no_answer',
  'handoff_to_human',
];
const temps: LeadTemperature[] = ['cold', 'warm', 'hot'];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api<LeadDetail>(`/leads/${id}`);
      setLead(res);
    } catch (err) {
      setError((err as ApiError).message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status: LeadStatus) {
    await api(`/leads/${id}`, { method: 'PATCH', body: { status } });
    load();
  }

  async function setTemp(temperature: LeadTemperature) {
    await api(`/leads/${id}`, { method: 'PATCH', body: { temperature } });
    load();
  }

  async function optOut() {
    if (!confirm('להסיר את הליד מקבלת תקשורת ב-WhatsApp?')) return;
    await api(`/leads/${id}/opt-out`, { method: 'POST', body: { channel: 'whatsapp', reason: 'manual' } });
    load();
  }

  if (error) return <div className="text-destructive">{error}</div>;
  if (!lead) return <div>טוען...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lead.fullName || 'ליד ללא שם'}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge value={lead.status} />
            <TempBadge value={lead.temperature} />
            {lead.assignedUser && (
              <span className="text-sm text-muted-foreground">משויך ל: {lead.assignedUser.name}</span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          חזרה
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>פרטי הליד</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="טלפון" value={lead.phone} dir="ltr" />
            <Field label="אימייל" value={lead.email} dir="ltr" />
            <Field label="כוונה" value={lead.intent} />
            <Field label="מקור" value={lead.source} />
            <Field label="עיר" value={lead.city} />
            <Field label="אזור" value={lead.area} />
            <Field
              label="תקציב"
              value={
                lead.budgetMin || lead.budgetMax
                  ? `${lead.budgetMin?.toLocaleString() ?? '?'} – ${lead.budgetMax?.toLocaleString() ?? '?'}`
                  : '—'
              }
            />
            <Field label="חדרים" value={lead.rooms?.toString() ?? null} />
            <Field label="נוצר" value={formatDate(lead.createdAt)} />
            <Field label="פולואפ הבא" value={formatDate(lead.nextFollowupAt)} />
            {lead.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">הערות:</p>
                <p className="whitespace-pre-wrap mt-1">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>פעולות מהירות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">סטטוס</label>
              <select
                value={lead.status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">טמפרטורה</label>
              <select
                value={lead.temperature}
                onChange={(e) => setTemp(e.target.value as LeadTemperature)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {temps.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="destructive" className="w-full" onClick={optOut}>
              הסר מתקשורת
            </Button>
          </CardContent>
        </Card>
      </div>

      <IdentitySection lead={lead} onSaved={load} />

      <Card>
        <CardHeader>
          <CardTitle>שיחות אחרונות</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">אין שיחות עדיין.</p>
          ) : (
            <ul className="space-y-2">
              {lead.conversations.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                  <a href={`/conversations/${c.id}`} className="text-sm hover:underline">
                    {c.channel} · {formatDate(c.startedAt)}
                  </a>
                  <span className="text-xs text-muted-foreground">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>משימות פתוחות</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">אין משימות פתוחות.</p>
          ) : (
            <ul className="space-y-2">
              {lead.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                  <span className="text-sm">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.dueAt ? formatDate(t.dueAt) : 'ללא תאריך'}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SignatureRequestsCard
        leadId={lead.id}
        defaultSignerName={lead.fullName ?? ''}
        defaultSignerEmail={lead.email ?? ''}
        defaultSignerPhone={lead.phone ?? ''}
      />
    </div>
  );
}

function Field({ label, value, dir }: { label: string; value: string | null | undefined; dir?: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium" dir={dir}>
        {value || '—'}
      </p>
    </div>
  );
}

/**
 * "Identity" card — captures the fields needed for contract / bank-auth
 * generation that aren't part of the normal lead intake. Click "ערוך" to
 * inline-edit; the values are PATCHed to /leads/:id and persist on the row.
 */
function IdentitySection({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: lead.fullName ?? '',
    nationalId: lead.nationalId ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    streetAddress: lead.streetAddress ?? '',
    city: lead.city ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      fullName: lead.fullName ?? '',
      nationalId: lead.nationalId ?? '',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      streetAddress: lead.streetAddress ?? '',
      city: lead.city ?? '',
    });
  }, [lead]);

  async function save() {
    setSaving(true);
    try {
      await api(`/leads/${lead.id}`, { method: 'PATCH', body: form });
      toast.success('פרטי הזדהות נשמרו');
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  const readyForAuth = lead.fullName && lead.nationalId && lead.phone;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            פרטי הזדהות
            {readyForAuth ? (
              <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">מוכן לחתימה</span>
            ) : (
              <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">חסרים פרטים</span>
            )}
          </span>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 ml-1.5" />
              עריכה
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label="שם מלא" value={lead.fullName} />
            <Field label="ת״ז" value={lead.nationalId} dir="ltr" />
            <Field label="טלפון" value={lead.phone} dir="ltr" />
            <Field label="אימייל" value={lead.email} dir="ltr" />
            <Field label="רחוב + מספר בית" value={lead.streetAddress} />
            <Field label="עיר" value={lead.city} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">שם מלא</label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">ת״ז</label>
                <Input dir="ltr" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">טלפון</label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">אימייל</label>
                <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">רחוב + מספר בית</label>
                <Input value={form.streetAddress} onChange={(e) => setForm({ ...form, streetAddress: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">עיר</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>ביטול</Button>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
