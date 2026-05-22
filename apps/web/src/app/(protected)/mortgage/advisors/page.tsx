'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { MortgageAdvisor } from '@/lib/types';

export default function AdvisorsPage() {
  const router = useRouter();
  const [advisors, setAdvisors] = useState<MortgageAdvisor[]>([]);
  const [form, setForm] = useState({ fullName: '', company: '', phone: '', email: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { fullName: form.fullName };
      if (form.company) body.company = form.company;
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.notes) body.notes = form.notes;
      await api('/mortgage/advisors', { method: 'POST', body });
      setForm({ fullName: '', company: '', phone: '', email: '', notes: '' });
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
              <Label htmlFor="fullName">שם</Label>
              <Input id="fullName" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company">חברה</Label>
              <Input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} />
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
                <TableHead>חברה</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>הפניות</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>נוצר</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">טוען...</TableCell></TableRow>}
              {!loading && advisors.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">אין יועצים — הוסף יועץ ראשון.</TableCell></TableRow>
              )}
              {advisors.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.fullName}</TableCell>
                  <TableCell>{a.company || '—'}</TableCell>
                  <TableCell dir="ltr">{a.phone || '—'}</TableCell>
                  <TableCell dir="ltr">{a.email || '—'}</TableCell>
                  <TableCell>{a._count?.referrals ?? 0}</TableCell>
                  <TableCell><Badge variant={a.status === 'active' ? 'success' : 'outline'}>{a.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => togglePause(a)}>
                      {a.status === 'active' ? 'השהה' : 'הפעל'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
