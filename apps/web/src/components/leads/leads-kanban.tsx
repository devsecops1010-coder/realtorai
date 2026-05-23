'use client';

// Drag-and-drop Kanban for leads. Native HTML5 DnD (no library dep) — works
// fine on desktop where the Kanban is most useful. Touch users still have the
// table view + tap-to-edit; full mobile DnD would need pointer-events which
// is a separate sprint.
//
// Why native DnD rather than dnd-kit / react-beautiful-dnd:
//   - Zero added bundle size on a page that already paginates 100 leads.
//   - The columns are status enum values — there's no nesting, reordering
//     within a column, multi-select, or other use-case the libraries shine at.
//   - PATCH /leads/:id is idempotent + cheap. Optimistic update + rollback on
//     error is enough; we don't need transactional reordering.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { TempBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/lib/types';

// Workflow order: active funnel on the left → terminal/dead on the right.
// `handoff_to_human` sits between live funnel and terminal because the AI
// stopped engaging but the lead isn't dead.
const COLUMNS: { status: LeadStatus; label: string; tone: string }[] = [
  { status: 'new', label: 'חדש', tone: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900' },
  { status: 'contacted', label: 'נוצר קשר', tone: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-900' },
  { status: 'qualified', label: 'מוסמך', tone: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900' },
  { status: 'hot', label: 'חם', tone: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900' },
  { status: 'meeting_scheduled', label: 'פגישה', tone: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900' },
  { status: 'handoff_to_human', label: 'הועבר למתווך', tone: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900' },
  { status: 'no_answer', label: 'אין מענה', tone: 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800' },
  { status: 'not_relevant', label: 'לא רלוונטי', tone: 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800' },
  { status: 'opted_out', label: 'הוסר', tone: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900' },
];

export function LeadsKanban({ leads, onUpdate }: { leads: Lead[]; onUpdate: (lead: Lead) => void }) {
  const router = useRouter();
  // The lead currently being dragged. We carry the full object (not just the
  // id) so we can rollback if the PATCH fails — saves an extra round trip.
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  // The column the user is hovering over while dragging. Used purely for the
  // visual ring highlight; doesn't affect business logic.
  const [hoverStatus, setHoverStatus] = useState<LeadStatus | null>(null);

  // Pre-bucket leads by status so each column only iterates its own slice.
  // O(n) once vs. O(n*9) if we filtered in render.
  const buckets = COLUMNS.reduce((acc, col) => {
    acc[col.status] = leads.filter((l) => l.status === col.status);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  async function handleDrop(targetStatus: LeadStatus) {
    setHoverStatus(null);
    if (!draggedLead) return;
    const lead = draggedLead;
    setDraggedLead(null);
    // No-op if dropped on the same column.
    if (lead.status === targetStatus) return;

    // Optimistic update — flip the status locally first so the card lands in
    // the new column instantly. If the server rejects we rollback below.
    onUpdate({ ...lead, status: targetStatus });
    try {
      const updated = await api<Lead>(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: { status: targetStatus },
      });
      onUpdate(updated);
      toast.success(`עודכן: ${COLUMNS.find((c) => c.status === targetStatus)?.label}`);
    } catch (e) {
      // Rollback to the pre-drop status so the user sees the failure clearly.
      onUpdate(lead);
      const msg = e instanceof ApiError ? e.message : 'עדכון נכשל';
      toast.error(msg);
    }
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map((col) => {
          const items = buckets[col.status] ?? [];
          const isHover = hoverStatus === col.status;
          return (
            <div
              key={col.status}
              className={`w-72 shrink-0 rounded-lg border-2 ${col.tone} ${
                isHover ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              } transition-all`}
              onDragOver={(e) => {
                // Required for HTML5 DnD — without preventDefault the drop
                // event never fires. Browser quirk.
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (hoverStatus !== col.status) setHoverStatus(col.status);
              }}
              onDragLeave={() => {
                // Only clear the hover if we're leaving _this_ column. The
                // event also fires when crossing into a child element, so we
                // schedule the clear in a microtask to let onDragOver re-set
                // it if we just entered a card.
                queueMicrotask(() => {
                  setHoverStatus((s) => (s === col.status ? null : s));
                });
              }}
              onDrop={() => handleDrop(col.status)}
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-current/10">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>

              <div className="p-2 space-y-2 min-h-32 max-h-[calc(100vh-22rem)] overflow-y-auto">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">ריק</p>
                )}
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      // Some browsers refuse to fire drop without _some_ data
                      // payload. The id is harmless and could be useful for
                      // cross-window drops later.
                      e.dataTransfer.setData('text/plain', lead.id);
                      setDraggedLead(lead);
                    }}
                    onDragEnd={() => {
                      setDraggedLead(null);
                      setHoverStatus(null);
                    }}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className={`bg-card border rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      draggedLead?.id === lead.id ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate flex-1">
                        {lead.fullName || 'ללא שם'}
                      </p>
                      <TempBadge value={lead.temperature} />
                    </div>
                    {lead.phone && (
                      <p className="text-xs text-muted-foreground" dir="ltr">{lead.phone}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </span>
                      {lead.assignedUser?.name && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[8rem]">
                          {lead.assignedUser.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
