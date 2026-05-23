'use client';

// Floating bulk-actions bar. Renders when 1+ leads are selected on the
// leads table. Three actions: change status, change temperature, assign
// to user. Delete is omitted from this bar — destructive enough that we
// want it behind an explicit confirmation modal (out of scope here).

import { useEffect, useState } from 'react';
import { Loader2, Users, Flame, ClipboardCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeadStatus } from '@/lib/types';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מוסמך',
  hot: 'חם',
  meeting_scheduled: 'פגישה',
  not_relevant: 'לא רלוונטי',
  no_answer: 'אין מענה',
  opted_out: 'הוסר',
  handoff_to_human: 'הועבר למתווך',
};

const STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'hot',
  'meeting_scheduled',
  'no_answer',
  'not_relevant',
  'handoff_to_human',
];

interface User {
  id: string;
  name: string;
}

export function BulkActionsBar({
  selected,
  onClear,
  onDone,
}: {
  selected: string[];
  onClear: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  // Lazy-load the user list only when the assign menu opens — saves a
  // request when the user is just navigating + selecting rows.
  useEffect(() => {
    if (!showAssign || users.length > 0) return;
    api<User[] | { items: User[] }>('/users')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { items: User[] }).items ?? [];
        setUsers(list);
      })
      .catch(() => undefined);
  }, [showAssign, users.length]);

  async function run(action: 'status' | 'temperature' | 'assign', value: string | null) {
    setBusy(true);
    try {
      const res = await api<{ updated: number }>('/leads/bulk', {
        method: 'POST',
        body: { ids: selected, action, value },
      });
      toast.success(`עודכנו ${res.updated} לידים`);
      setShowAssign(false);
      setShowStatus(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'עדכון נכשל');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card/95 backdrop-blur shadow-lg px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="px-2.5 py-1">
          {selected.length} נבחרו
        </Badge>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Status menu */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowStatus((s) => !s);
              setShowAssign(false);
            }}
            disabled={busy}
            className="gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> סטטוס
          </Button>
          {showStatus && (
            <div className="absolute bottom-full mb-2 left-0 min-w-[160px] rounded-md border bg-popover shadow-md py-1 z-40">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className="w-full text-right px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => run('status', s)}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Temperature direct buttons — only 3 values, no menu needed. */}
        <div className="inline-flex rounded-md border bg-card overflow-hidden">
          <button
            className="px-2.5 py-1 text-xs hover:bg-accent border-l"
            onClick={() => run('temperature', 'cold')}
            disabled={busy}
          >
            ❄️ קר
          </button>
          <button
            className="px-2.5 py-1 text-xs hover:bg-accent border-l"
            onClick={() => run('temperature', 'warm')}
            disabled={busy}
          >
            ☁️ פושר
          </button>
          <button
            className="px-2.5 py-1 text-xs hover:bg-accent"
            onClick={() => run('temperature', 'hot')}
            disabled={busy}
          >
            🔥 חם
          </button>
        </div>

        {/* Assign menu */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAssign((a) => !a);
              setShowStatus(false);
            }}
            disabled={busy}
            className="gap-1.5"
          >
            <Users className="h-3.5 w-3.5" /> הקצה ל-
          </Button>
          {showAssign && (
            <div className="absolute bottom-full mb-2 left-0 min-w-[200px] max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md py-1 z-40">
              <button
                className="w-full text-right px-3 py-1.5 text-sm hover:bg-accent text-muted-foreground italic"
                onClick={() => run('assign', null)}
              >
                — בטל הקצאה —
              </button>
              {users.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">טוען...</p>
              )}
              {users.map((u) => (
                <button
                  key={u.id}
                  className="w-full text-right px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => run('assign', u.id)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          נקה
        </Button>
      </div>
    </div>
  );
}
