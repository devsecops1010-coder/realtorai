'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { ConversationListItem, Paginated } from '@/lib/types';

export default function ConversationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<Paginated<ConversationListItem>>('/conversations?take=100');
        setItems(res.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">שיחות</h1>
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
