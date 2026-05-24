'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressPicker, EMPTY_ADDRESS, type AddressValue } from '@/components/geo/address-picker';
import type { Property, PropertyCondition, PropertyDealType } from '@/lib/types';

const conditions: PropertyCondition[] = ['new', 'excellent', 'good', 'needs_renovation', 'for_demolition'];

export default function NewPropertyPage() {
  const router = useRouter();
  // Split the form into "non-address" + the AddressPicker's value. Keeps
  // each control responsible for its own slice of state and lets the
  // address picker stay reusable.
  const [form, setForm] = useState({
    dealType: 'sale' as PropertyDealType,
    area: '',
    rooms: '',
    floor: '',
    price: '',
    condition: '' as PropertyCondition | '',
    notes: '',
  });
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
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
      // Build the request body. Both free-text + structured ids are
      // sent — the service uses settlementId/streetId as the source of
      // truth and backfills city/street from them.
      const body: Record<string, unknown> = { dealType: form.dealType };
      if (address.city) body.city = address.city;
      if (form.area) body.area = form.area;
      if (address.street) body.street = address.street;
      if (address.settlementId) body.settlementId = address.settlementId;
      if (address.streetId) body.streetId = address.streetId;
      if (address.houseNumber !== null) body.houseNumber = address.houseNumber;
      if (address.latitude !== null) body.latitude = address.latitude;
      if (address.longitude !== null) body.longitude = address.longitude;
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
          <form onSubmit={onSubmit} className="space-y-5">
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
                <Label htmlFor="area">אזור / שכונה</Label>
                <Input id="area" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="לדוגמה: צפון ישן" />
              </div>
            </div>

            {/* Structured address from the IL geo dataset (1,306 cities,
                63,563 streets). Auto-geocodes lat/lng from the chosen
                settlement so the marketplace map shows the property
                without manual coords. */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <Label className="text-sm font-semibold">כתובת מלאה</Label>
              <AddressPicker value={address} onChange={setAddress} />
              {address.settlementId && (
                <p className="text-xs text-muted-foreground">
                  הקואורדינטות יחושבו אוטומטית ממרכז העיר
                  {address.latitude !== null && (
                    <> ({address.latitude.toFixed(4)}, {address.longitude?.toFixed(4)})</>
                  )}.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
