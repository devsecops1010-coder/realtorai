'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { Property } from '@/lib/types';

export default function PropertiesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Property[]>('/properties')
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">נכסים</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/properties/bulk-upload')}>
            העלאת בעלי דירות
          </Button>
          <Button onClick={() => router.push('/properties/new')}>נכס חדש</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימה</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>סוג עסקה</TableHead>
                <TableHead>עיר</TableHead>
                <TableHead>אזור</TableHead>
                <TableHead>חדרים</TableHead>
                <TableHead>מחיר</TableHead>
                <TableHead>בעלים</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>נוצר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    טוען...
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    אין נכסים.
                  </TableCell>
                </TableRow>
              )}
              {items.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/properties/${p.id}`)}
                >
                  <TableCell>
                    <Badge variant={p.dealType === 'sale' ? 'default' : 'secondary'}>
                      {p.dealType === 'sale' ? 'מכירה' : 'השכרה'}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.city || '—'}</TableCell>
                  <TableCell>{p.area || '—'}</TableCell>
                  <TableCell>{p.rooms ?? '—'}</TableCell>
                  <TableCell>{p.price ? `₪${p.price.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>{p.ownerLead?.fullName || '—'}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
