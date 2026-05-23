'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { ConversationListItem, ConversationStatus, Paginated } from '@/lib/types';

const STATUS_LABELS: Record<ConversationStatus, string> = {
  active: 'פעילה',
  waiting: 'בהמתנה',
  closed: 'סגורה',
  handoff: 'בהעברה',
};

function ConversationsPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const status = search.get('status') as ConversationStatus | null;
  const handoffRequired = search.get('handoffRequired');

  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (handoffRequired) params.set('handoffRequired', handoffRequired);
      params.set('take', '100');
      try {
        const res = await api<Paginated<ConversationListItem>>(`/conversations?${params.toString()}`);
        setItems(res.items);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, handoffRequired]);

  const hasFilter = Boolean(status || handoffRequired);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">שיחות</h1>

      {hasFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">מסונן לפי:</span>
          {status && (
            <Badge variant="secondary">סטטוס: {STATUS_LABELS[status] ?? status}</Badge>
          )}
          {handoffRequired === 'true' && (
            <Badge variant="secondary">דורשות העברה</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/conversations')}
            className="h-7 gap-1"
          >
            <X className="h-3 w-3" /> נקה
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>רשימה</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ליד</TableHead>
                <TableHead>ערוץ</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>סוכן</TableHead>
                <TableHead>הודעות</TableHead>
                <TableHead>התחלה</TableHead>
                <TableHead>דורש העברה?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    טוען...
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    אין שיחות.
                  </TableCell>
                </TableRow>
              )}
              {items.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/conversations/${c.id}`)}
                >
                  <TableCell>{c.lead?.fullName || c.lead?.phone || '—'}</TableCell>
                  <TableCell>{c.channel}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'handoff' ? 'destructive' : 'default'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.agent?.name || '—'}</TableCell>
                  <TableCell>{c._count.messages}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.startedAt)}</TableCell>
                  <TableCell>{c.handoffRequired ? '⚠️ כן' : 'לא'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <ConversationsPageInner />
    </Suspense>
  );
}
