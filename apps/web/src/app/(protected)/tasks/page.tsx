'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { Paginated, Task } from '@/lib/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'open' | 'all' | 'mine'>('open');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'open') params.set('status', 'open');
      if (filter === 'mine') params.set('mine', 'true');
      params.set('take', '100');
      const res = await api<Paginated<Task>>(`/tasks?${params.toString()}`);
      setTasks(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function close(taskId: string) {
    await api(`/tasks/${taskId}`, { method: 'PATCH', body: { status: 'done' } });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">משימות</h1>
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
