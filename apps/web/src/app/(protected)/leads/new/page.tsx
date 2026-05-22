'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Lead, LeadIntent } from '@/lib/types';

const intents: LeadIntent[] = ['buy', 'sell', 'rent', 'list_for_rent', 'unknown'];

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    intent: 'buy' as LeadIntent,
    city: '',
    area: '',
    budgetMin: '',
    budgetMax: '',
    rooms: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        intent: form.intent,
      };
      if (form.fullName) body.fullName = form.fullName;
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.city) body.city = form.city;
      if (form.area) body.area = form.area;
      if (form.budgetMin) body.budgetMin = parseInt(form.budgetMin, 10);
      if (form.budgetMax) body.budgetMax = parseInt(form.budgetMax, 10);
      if (form.rooms) body.rooms = parseFloat(form.rooms);
      if (form.notes) body.notes = form.notes;

      const lead = await api<Lead>('/leads', { method: 'POST', body });
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      const e = err as ApiError;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">ליד חדש</h1>
      <Card>
        <CardHeader>
          <CardTitle>פרטי הליד</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">שם מלא</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intent">כוונה</Label>
                <select
                  id="intent"
                  value={form.intent}
                  onChange={(e) => set('intent', e.target.value as LeadIntent)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {intents.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">עיר</Label>
                <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">אזור</Label>
                <Input id="area" value={form.area} onChange={(e) => set('area', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMin">תקציב מינ'</Label>
                <Input id="budgetMin" type="number" value={form.budgetMin} onChange={(e) => set('budgetMin', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">תקציב מקס'</Label>
                <Input id="budgetMax" type="number" value={form.budgetMax} onChange={(e) => set('budgetMax', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rooms">חדרים</Label>
                <Input id="rooms" type="number" step="0.5" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={4} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'שומר...' : 'שמור'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                ביטול
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
