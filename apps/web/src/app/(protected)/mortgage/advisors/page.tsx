'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { MortgageAdvisor } from '@/lib/types';

type CreateForm = {
  fullName: string;
  nationalId: string;
  licenseNumber: string;
  consultingCompany: string;
  consultingCompanyId: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY: CreateForm = {
  fullName: '',
  nationalId: '',
  licenseNumber: '',
  consultingCompany: '',
  consultingCompanyId: '',
  phone: '',
  email: '',
  notes: '',
};

export default function AdvisorsPage() {
  const router = useRouter();
  const [advisors, setAdvisors] = useState<MortgageAdvisor[]>([]);
  const [form, setForm] = useState<CreateForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<MortgageAdvisor | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api<MortgageAdvisor[]>('/mortgage/advisors');
      setAdvisors(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set<K extends keyof CreateForm>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { fullName: form.fullName };
      if (form.nationalId) body.nationalId = form.nationalId;
      if (form.licenseNumber) body.licenseNumber = form.licenseNumber;
      if (form.consultingCompany) body.consultingCompany = form.consultingCompany;
      if (form.consultingCompanyId) body.consultingCompanyId = form.consultingCompanyId;
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.notes) body.notes = form.notes;
      await api('/mortgage/advisors', { method: 'POST', body });
      setForm(EMPTY);
      toast.success('היועץ נוסף');
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePause(a: MortgageAdvisor) {
    await api(`/mortgage/advisors/${a.id}`, {
      method: 'PATCH',
      body: { status: a.status === 'active' ? 'paused' : 'active' },
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">יועצי משכנתאות</h1>
        <Button variant="outline" onClick={() => router.push('/mortgage')}>חזרה</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הוסף יועץ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="fullName">שם מלא *</Label>
              <Input id="fullName" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nationalId">ת״ז</Label>
              <Input id="nationalId" dir="ltr" value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="licenseNumber">מספר רישיון</Label>
              <Input id="licenseNumber" dir="ltr" value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="consultingCompany">חברת ייעוץ</Label>
              <Input id="consultingCompany" value={form.consultingCompany} onChange={(e) => set('consultingCompany', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="consultingCompanyId">ח״פ חברה</Label>
              <Input id="consultingCompanyId" dir="ltr" value={form.consultingCompanyId} onChange={(e) => set('consultingCompanyId', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">טלפון</Label>
              <Input id="phone" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="notes">הערות</Label>
              <Input id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="md:col-span-3 flex items-center gap-3">
              <Button type="submit" disabled={submitting}>{submitting ? 'שומר...' : 'הוסף'}</Button>
              {error && <span className="text-sm text-destructive">{error}</span>}
              <p className="text-xs text-muted-foreground">
                * שדות ת״ז + חברת ייעוץ נדרשים ליצירת כתבי הסמכה לבנקים. אם תשאיר ריק תוכל למלא ידנית בכל כתב הסמכה.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>יועצים פעילים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>ת״ז</TableHead>
                <TableHead>רישיון</TableHead>
                <TableHead>חברת ייעוץ</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>הפניות</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">טוען...</TableCell></TableRow>}
              {!loading && advisors.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">אין יועצים — הוסף יועץ ראשון.</TableCell></TableRow>
              )}
              {advisors.map((a) => {
                const readyForAuth = a.nationalId && a.consultingCompany;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {a.fullName}
                        {readyForAuth && (
                          <Badge variant="success" className="text-[10px]">מוכן לחתימה</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell dir="ltr" className="text-xs">{a.nationalId || '—'}</TableCell>
                    <TableCell dir="ltr" className="text-xs">{a.licenseNumber || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {a.consultingCompany ? (
                        <div>
                          <div>{a.consultingCompany}</div>
                          {a.consultingCompanyId && (
                            <div dir="ltr" className="text-muted-foreground">{a.consultingCompanyId}</div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell dir="ltr">{a.phone || '—'}</TableCell>
                    <TableCell>{a._count?.referrals ?? 0}</TableCell>
                    <TableCell><Badge variant={a.status === 'active' ? 'success' : 'outline'}>{a.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => togglePause(a)}>
                          {a.status === 'active' ? 'השהה' : 'הפעל'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditAdvisorDialog
          advisor={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function EditAdvisorDialog({
  advisor,
  onClose,
  onSaved,
}: {
  advisor: MortgageAdvisor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fullName: advisor.fullName,
    nationalId: advisor.nationalId ?? '',
    licenseNumber: advisor.licenseNumber ?? '',
    consultingCompany: advisor.consultingCompany ?? '',
    consultingCompanyId: advisor.consultingCompanyId ?? '',
    phone: advisor.phone ?? '',
    email: advisor.email ?? '',
    notes: advisor.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/mortgage/advisors/${advisor.id}`, {
        method: 'PATCH',
        body: form,
      });
      toast.success('היועץ עודכן');
      onSaved();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-xl my-8 rounded-xl bg-background border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold">עריכת יועץ</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>שם מלא</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <Label>ת״ז</Label>
              <Input dir="ltr" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </div>
            <div>
              <Label>מספר רישיון</Label>
              <Input dir="ltr" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>חברת ייעוץ</Label>
              <Input value={form.consultingCompany} onChange={(e) => setForm({ ...form, consultingCompany: e.target.value })} />
            </div>
            <div>
              <Label>ח״פ חברה</Label>
              <Input dir="ltr" value={form.consultingCompanyId} onChange={(e) => setForm({ ...form, consultingCompanyId: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>הערות</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button size="sm" disabled={saving} onClick={save}>{saving ? 'שומר…' : 'שמירה'}</Button>
        </div>
      </div>
    </div>
  );
}
