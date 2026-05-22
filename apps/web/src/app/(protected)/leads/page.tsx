'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, TempBadge } from '@/components/leads/status-badge';
import { formatDate } from '@/lib/utils';
import type { Lead, Paginated } from '@/lib/types';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(search = q) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      params.set('take', '100');
      const res = await api<Paginated<Lead>>(`/leads?${params.toString()}`);
      setLeads(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">לידים</h1>
        <Button onClick={() => router.push('/leads/new')}>ליד חדש</Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <Input placeholder="חיפוש לפי שם / טלפון / אימייל" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline">
          חיפוש
        </Button>
      </form>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead>כוונה</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>טמפ'</TableHead>
              <TableHead>הוקצה ל</TableHead>
              <TableHead>נוצר</TableHead>
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
            {!loading && leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  אין לידים להצגה
                </TableCell>
              </TableRow>
            )}
            {leads.map((l) => (
              <TableRow
                key={l.id}
                className="cursor-pointer"
                onClick={() => router.push(`/leads/${l.id}`)}
              >
                <TableCell>
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">
                    {l.fullName || '—'}
                  </Link>
                </TableCell>
                <TableCell dir="ltr">{l.phone || '—'}</TableCell>
                <TableCell>{l.intent}</TableCell>
                <TableCell>
                  <StatusBadge value={l.status} />
                </TableCell>
                <TableCell>
                  <TempBadge value={l.temperature} />
                </TableCell>
                <TableCell>{l.assignedUser?.name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">סה"כ: {total}</p>
    </div>
  );
}
