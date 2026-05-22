'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Office } from '@/lib/types';

export default function OfficePage() {
  const [office, setOffice] = useState<Office | null>(null);

  useEffect(() => {
    api<Office>('/offices/current').then(setOffice).catch(() => setOffice(null));
  }, []);

  if (!office) return <div>טוען...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">המשרד שלי</h1>
      <Card>
        <CardHeader>
          <CardTitle>{office.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="עיר" value={office.city} />
          <Field label="טלפון" value={office.phone} dir="ltr" />
          <Field label="WhatsApp" value={office.whatsappNumber} dir="ltr" />
          <Field label="סטטוס" value={office.status} />
          {office.areas.length > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground">אזורים:</p>
              <p>{office.areas.join(', ')}</p>
            </div>
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
      <p className="font-medium" dir={dir}>{value || '—'}</p>
    </div>
  );
}
