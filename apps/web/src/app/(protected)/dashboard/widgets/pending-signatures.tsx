'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSignature, Clock, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { WidgetShell, WidgetEmpty, WidgetLoading } from './widget-shell';

interface SignDoc {
  id: string;
  originalFileName: string;
  status: string;
  createdAt: string;
  signatureRequest: {
    id: string;
    signerName: string;
    signerEmail: string;
    status: string;
  } | null;
  lead?: { id: string; fullName: string | null } | null;
  property?: { id: string; city: string | null; street: string | null } | null;
}

const PENDING_STATUSES = new Set(['draft', 'sent', 'viewed']);

/**
 * Documents waiting on signature — the team's signature inbox.
 *
 * Filters the full /sign/documents list to non-completed status, sorted by
 * recency. Deep-links each row to /documents/[id] for the full audit trail
 * and download options.
 */
export function PendingSignaturesWidget() {
  const [docs, setDocs] = useState<SignDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<SignDoc[]>('/sign/documents')
      .then((all) => setDocs(all.filter((d) => PENDING_STATUSES.has(d.status))))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="חתימות ממתינות" icon={FileSignature} iconColor="text-violet-600" href="/documents">
      {loading ? (
        <WidgetLoading />
      ) : docs.length === 0 ? (
        <WidgetEmpty>אין חתימות ממתינות.</WidgetEmpty>
      ) : (
        <div className="space-y-1.5">
          {docs.slice(0, 5).map((d) => {
            const subtitle =
              d.signatureRequest?.signerName ??
              d.lead?.fullName ??
              (d.property ? `${d.property.city ?? ''} ${d.property.street ?? ''}`.trim() : null) ??
              'ללא נמען';
            return (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition group"
              >
                <Clock className="h-3.5 w-3.5 text-amber-600 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.originalFileName}</p>
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary mt-1 transition" />
              </Link>
            );
          })}
          {docs.length > 5 && (
            <Link
              href="/documents"
              className="block text-xs text-primary hover:underline pt-1 border-t"
            >
              עוד {docs.length - 5} מסמכים
            </Link>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
