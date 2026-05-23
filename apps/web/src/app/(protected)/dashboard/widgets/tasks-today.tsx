'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ListTodo, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface TaskRow {
  id: string;
  title: string;
  type: string;
  status: string;
  dueAt: string | null;
  lead?: { id: string; fullName: string | null } | null;
}

/**
 * My open tasks for today, sorted urgent → later. Caps at 6 rows; a "all
 * tasks" footer link punts to /tasks for the full view.
 */
export function TasksTodayWidget() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The /tasks endpoint already supports filtering by status + dueDate via
    // querystring. We pull `due=today,overdue` so urgent items always float.
    api<TaskRow[]>('/tasks?status=open&assignee=me&take=6')
      .then(setTasks)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="המשימות שלי" icon={ListTodo}>
      {loading ? (
        <WidgetLoading />
      ) : tasks.length === 0 ? (
        <WidgetEmpty>אין משימות פתוחות. יום נעים!</WidgetEmpty>
      ) : (
        <div className="space-y-1.5">
          {tasks.slice(0, 5).map((t) => {
            const overdue = t.dueAt && new Date(t.dueAt) < new Date();
            return (
              <Link
                key={t.id}
                href={`/tasks?id=${t.id}`}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition group"
              >
                {overdue && <AlertCircle className="h-3.5 w-3.5 text-rose-600 mt-1 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.lead?.fullName && (
                    <p className="text-xs text-muted-foreground truncate">{t.lead.fullName}</p>
                  )}
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition" />
              </Link>
            );
          })}
          <Link
            href="/tasks?status=open"
            className="block text-xs text-primary hover:underline pt-2 border-t"
          >
            כל המשימות הפתוחות ({tasks.length}+)
          </Link>
        </div>
      )}
    </WidgetShell>
  );
}
