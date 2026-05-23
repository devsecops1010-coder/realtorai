'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignatureRequestsCard } from '@/components/sign/signature-requests-card';
import { formatDate } from '@/lib/utils';
import type { Property, PropertyStatus } from '@/lib/types';

const statuses: PropertyStatus[] = ['draft', 'active', 'pending', 'sold', 'rented', 'withdrawn'];

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [p, setP] = useState<Property | null>(null);

  async function load() {
    const res = await api<Property>(`/properties/${id}`);
    setP(res);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status: PropertyStatus) {
    await api(`/properties/${id}`, { method: 'PATCH', body: { status } });
    load();
  }

  if (!p) return <div>טוען...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {p.city || '—'} {p.area ? `· ${p.area}` : ''} {p.street ? `· ${p.street}` : ''}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={p.dealType === 'sale' ? 'default' : 'secondary'}>
              {p.dealType === 'sale' ? 'מכירה' : 'השכרה'}
            </Badge>
            <Badge variant="outline">{p.status}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.back()}>חזרה</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הנכס</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="חדרים" value={p.rooms?.toString() ?? null} />
          <Field label="קומה" value={p.floor?.toString() ?? null} />
          <Field label="מחיר" value={p.price ? `₪${p.price.toLocaleString()}` : null} />
          <Field label="מצב" value={p.condition} />
          <Field label="עיר" value={p.city} />
          <Field label="אזור" value={p.area} />
          <Field label="רחוב" value={p.street} />
          <Field label="נוצר" value={formatDate(p.createdAt)} />
          {p.ownerLead && (
            <div className="col-span-2">
              <p className="text-muted-foreground">בעלים</p>
              <a href={`/leads/${p.ownerLead.id}`} className="font-medium hover:underline">
                {p.ownerLead.fullName ?? p.ownerLead.phone ?? '—'}
              </a>
            </div>
          )}
          {p.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">הערות</p>
              <p className="whitespace-pre-wrap mt-1">{p.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>סטטוס</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={p.status}
            onChange={(e) => setStatus(e.target.value as PropertyStatus)}
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <SignatureRequestsCard
        propertyId={p.id}
        title="חוזים ומסמכים"
        defaultSignerName={p.ownerLead?.fullName ?? ''}
        defaultSignerEmail={p.ownerLead?.email ?? ''}
        defaultSignerPhone={p.ownerLead?.phone ?? ''}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
