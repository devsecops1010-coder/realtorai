'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, TempBadge } from '@/components/leads/status-badge';
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
