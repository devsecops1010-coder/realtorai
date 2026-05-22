'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Property, PropertyCondition, PropertyDealType } from '@/lib/types';

const conditions: PropertyCondition[] = ['new', 'excellent', 'good', 'needs_renovation', 'for_demolition'];

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    dealType: 'sale' as PropertyDealType,
    city: '',
    area: '',
    street: '',
    rooms: '',
    floor: '',
    price: '',
    condition: '' as PropertyCondition | '',
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
      const body: Record<string, unknown> = { dealType: form.dealType };
      if (form.city) body.city = form.city;
      if (form.area) body.area = form.area;
      if (form.street) body.street = form.street;
      if (form.rooms) body.rooms = parseFloat(form.rooms);
      if (form.floor) body.floor = parseInt(form.floor, 10);
      if (form.price) body.price = parseInt(form.price, 10);
      if (form.condition) body.condition = form.condition;
      if (form.notes) body.notes = form.notes;

      const property = await api<Property>('/properties', { method: 'POST', body });
      router.push(`/properties/${property.id}`);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">נכס חדש</h1>
      <Card>
        <CardHeader>
          <CardTitle>פרטים</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealType">סוג עסקה</Label>
                <select
                  id="dealType"
                  value={form.dealType}
                  onChange={(e) => set('dealType', e.target.value as PropertyDealType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="sale">מכירה</option>
                  <option value="rent">השכרה</option>
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
                <Label htmlFor="street">רחוב</Label>
                <Input id="street" value={form.street} onChange={(e) => set('street', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rooms">חדרים</Label>
                <Input id="rooms" type="number" step="0.5" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">קומה</Label>
                <Input id="floor" type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">מחיר</Label>
                <Input id="price" type="number" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">מצב</Label>
                <select
                  id="condition"
                  value={form.condition}
                  onChange={(e) => set('condition', e.target.value as PropertyCondition)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {conditions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea id="notes" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? 'שומר...' : 'שמור'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>ביטול</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
