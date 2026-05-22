'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const PLACEHOLDER = `ניתן להזין בעלי דירות בפורמט CSV. השורה הראשונה היא כותרות.
שם,טלפון,סוג,עיר,אזור,חדרים,מחיר
דני,0501234567,sale,תל אביב,צפון ישן,4,3500000
רותי,0507654321,rent,רמת גן,מרכז,3,7500`;

export default function BulkUploadPage() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const owners = parseCsv(csv);
      if (owners.length === 0) {
        setError('לא נמצאו שורות נתונים');
        return;
      }
      const res = await api<{ count: number }>('/properties/bulk-upload-owners', {
        method: 'POST',
        body: { owners },
      });
      setResult(res);
    } catch (err) {
      setError((err as ApiError).message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">העלאת בעלי דירות</h1>
      <Card>
        <CardHeader>
          <CardTitle>הדבק רשימה (CSV)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Textarea
              dir="ltr"
              rows={12}
              placeholder={PLACEHOLDER}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {result && (
              <p className="text-sm text-emerald-700">
                נוספו {result.count} בעלי דירות. ניתן לראות אותם תחת לידים ונכסים.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !csv.trim()}>
                {loading ? 'מעלה...' : 'העלה'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/properties')}>
                סגור
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function parseCsv(text: string): unknown[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ''));
    return {
      ownerName: row['שם'] ?? row['name'] ?? row['ownerName'],
      ownerPhone: row['טלפון'] ?? row['phone'] ?? row['ownerPhone'],
      dealType: row['סוג'] === 'מכירה' ? 'sale' : row['סוג'] === 'השכרה' ? 'rent' : row['סוג'] ?? row['dealType'] ?? 'sale',
      city: row['עיר'] ?? row['city'] ?? undefined,
      area: row['אזור'] ?? row['area'] ?? undefined,
      rooms: row['חדרים'] ? Number(row['חדרים']) : row['rooms'] ? Number(row['rooms']) : undefined,
      price: row['מחיר'] ? Number(row['מחיר']) : row['price'] ? Number(row['price']) : undefined,
    };
  });
}
