'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { Paginated, Task } from '@/lib/types';

function isDueToday(iso: string | null): boolean {
  if (!iso) return false;
  const due = new Date(iso);
  const now = new Date();
  // Due today OR overdue (any moment from epoch to end-of-today).
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return due <= endOfToday;
}

function TasksPageInner() {
  const search = useSearchParams();
  const urlStatus = search.get('status');
  const dueFilter = search.get('due'); // 'today' = due ≤ end-of-today

  const initialFilter: 'open' | 'all' | 'mine' =
    urlStatus === 'open' || dueFilter === 'today' ? 'open' : 'open';
  const [filter, setFilter] = useState<'open' | 'all' | 'mine'>(initialFilter);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'open') params.set('status', 'open');
      if (filter === 'mine') params.set('mine', 'true');
      params.set('take', '100');
      const res = await api<Paginated<Task>>(`/tasks?${params.toString()}`);
      // Apply due-today client-side since the API doesn't have a dueBefore filter yet.
      const items = dueFilter === 'today' ? res.items.filter((t) => isDueToday(t.dueAt)) : res.items;
      setTasks(items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, dueFilter]);

  async function close(taskId: string) {
    await api(`/tasks/${taskId}`, { method: 'PATCH', body: { status: 'done' } });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">משימות</h1>
        {dueFilter === 'today' && (
          <Badge variant="warning" className="text-sm">דחוף להיום בלבד</Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>
          פתוחות
        </Button>
        <Button variant={filter === 'mine' ? 'default' : 'outline'} onClick={() => setFilter('mine')}>
          שלי
        </Button>
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          הכל
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימה</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>כותרת</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>ליד</TableHead>
                <TableHead>הוקצה ל</TableHead>
                <TableHead>תאריך יעד</TableHead>
                <TableHead></TableHead>
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
              {!loading && tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    אין משימות.
                  </TableCell>
                </TableRow>
              )}
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.type}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'done' ? 'success' : t.status === 'open' ? 'default' : 'outline'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.lead ? (
                      <a href={`/leads/${t.lead.id}`} className="hover:underline">
                        {t.lead.fullName || t.lead.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{t.assignedUser?.name || '—'}</TableCell>
                  <TableCell>{t.dueAt ? formatDate(t.dueAt) : '—'}</TableCell>
                  <TableCell>
                    {t.status !== 'done' && (
                      <Button size="sm" variant="outline" onClick={() => close(t.id)}>
                        סגור
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <TasksPageInner />
    </Suspense>
  );
}
