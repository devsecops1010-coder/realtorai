'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Download, ArrowRight, FileText, Send, Mail, ShieldCheck,
  CheckCircle2, X, ScrollText, Bot, User, ServerCog, Loader2,
} from 'lucide-react';
import { api, apiUrl, ApiError } from '@/lib/api';
import { PdfPreview } from '@/components/sign/pdf-preview';

interface DocumentDetail {
  id: string;
  originalFileName: string;
  documentHash: string;
  signedDocumentHash: string | null;
  status: string;
  createdAt: string;
  signatureRequest?: {
    id: string;
    signerName: string;
    signerEmail: string;
    status: string;
    tokenExpiresAt: string;
    otpVerifiedAt: string | null;
    signedAt: string | null;
  } | null;
  signature?: {
    id: string;
    signerName: string;
    ipAddress: string | null;
    userAgent: string | null;
    signedAt: string;
  } | null;
  uploadedBy: { id: string; fullName: string; email: string };
}

interface AuditEntry {
  id: string;
  eventType: string;
  eventDescription: string;
  actorType: string;
  actorId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'טיוטה', sent: 'נשלח', viewed: 'נצפה', otp_verified: 'אומת',
  signed: 'נחתם', declined: 'נדחה', expired: 'פג תוקף', cancelled: 'בוטל',
};
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-cyan-100 text-cyan-700',
  otp_verified: 'bg-violet-100 text-violet-700',
  signed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const ACTOR_ICON = {
  org_admin: User, employee: User, signer: User, system: ServerCog, platform: ShieldCheck,
} as Record<string, React.ComponentType<{ className?: string }>>;

const ACTOR_LABEL = {
  org_admin: 'מנהל ארגון', employee: 'עובד', signer: 'חותם', system: 'מערכת', platform: 'פלטפורמה',
} as Record<string, string>;

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  function reload() {
    return Promise.all([
      api<DocumentDetail>(`/sign/documents/${id}`).then(setDoc),
      api<AuditEntry[]>(`/sign/documents/${id}/audit`).then(setEvents),
    ]);
  }

  useEffect(() => {
    reload().catch((err) => toast.error((err as ApiError).message)).finally(() => setLoading(false));
  }, [id]);

  async function cancel() {
    if (!doc?.signatureRequest) return;
    if (!confirm('לבטל את בקשת החתימה?')) return;
    setCancelling(true);
    try {
      await api(`/sign/signature-requests/${doc.signatureRequest.id}/cancel`, { method: 'POST', body: {} });
      toast.success('הבקשה בוטלה');
      await reload();
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <Shell><div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div></Shell>;
  }
  if (!doc) {
    return <Shell><div className="text-center py-12 text-destructive">המסמך לא נמצא</div></Shell>;
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowRight className="h-3.5 w-3.5" /> חזרה לדשבורד
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {doc.originalFileName}
              </h1>
              <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                hash: {doc.documentHash.slice(0, 24)}…
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded text-sm ${STATUS_COLOR[doc.status]}`}>
              {STATUS_LABEL[doc.status] ?? doc.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="פרטי חותם" icon={Send}>
            {doc.signatureRequest ? (
              <dl className="text-sm space-y-1.5">
                <KV label="שם">{doc.signatureRequest.signerName}</KV>
                <KV label="אימייל"><span dir="ltr">{doc.signatureRequest.signerEmail}</span></KV>
                <KV label="קישור תקף עד"><span dir="ltr">{new Date(doc.signatureRequest.tokenExpiresAt).toLocaleString('he-IL')}</span></KV>
                {doc.signatureRequest.otpVerifiedAt && (
                  <KV label="OTP אומת"><span dir="ltr">{new Date(doc.signatureRequest.otpVerifiedAt).toLocaleString('he-IL')}</span></KV>
                )}
                {doc.signatureRequest.signedAt && (
                  <KV label="נחתם"><span dir="ltr">{new Date(doc.signatureRequest.signedAt).toLocaleString('he-IL')}</span></KV>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">עדיין לא נשלחה בקשת חתימה.</p>
            )}
          </Card>

          <Card title="ראיות חתימה" icon={ShieldCheck}>
            {doc.signature ? (
              <dl className="text-sm space-y-1.5">
                <KV label="חותם">{doc.signature.signerName}</KV>
                <KV label="IP"><span dir="ltr">{doc.signature.ipAddress ?? '—'}</span></KV>
                <KV label="User Agent">
                  <span dir="ltr" className="text-xs truncate inline-block max-w-[260px]">{doc.signature.userAgent ?? '—'}</span>
                </KV>
                {doc.signedDocumentHash && (
                  <KV label="signed sha256"><span dir="ltr" className="font-mono text-xs">{doc.signedDocumentHash.slice(0, 24)}…</span></KV>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">המסמך עדיין לא נחתם.</p>
            )}
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={`${apiUrl}/sign/documents/${doc.id}/download`} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-white hover:bg-muted text-sm">
            <Download className="h-4 w-4" /> מסמך מקורי
          </a>
          {doc.signedDocumentHash && (
            <a href={`${apiUrl}/sign/documents/${doc.id}/download-signed`} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm">
              <Download className="h-4 w-4" /> מסמך חתום
            </a>
          )}
          {doc.signatureRequest && doc.status !== 'signed' && doc.status !== 'cancelled' && (
            <button onClick={cancel} disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 text-sm disabled:opacity-50">
              <X className="h-4 w-4" /> בטל בקשת חתימה
            </button>
          )}
        </div>

        {/* Inline PDF preview — defaults to the signed copy when it exists so
            the user immediately sees the final document, with a toggle back
            to the original for verification. */}
        <PdfPreview
          documentId={doc.id}
          hasSignedVersion={Boolean(doc.signedDocumentHash)}
        />

        <div className="bg-white border rounded-2xl">
          <div className="p-4 border-b flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">יומן ראיות ({events.length})</h2>
          </div>
          <ul className="divide-y">
            {events.map((ev) => {
              const Icon = ACTOR_ICON[ev.actorType] ?? ServerCog;
              return (
                <li key={ev.id} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                  <Icon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <code className="text-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{ev.eventType}</code>
                      <span className="text-muted-foreground">{ACTOR_LABEL[ev.actorType] ?? ev.actorType}</span>
                      <span className="text-muted-foreground" dir="ltr">{new Date(ev.createdAt).toLocaleString('he-IL')}</span>
                    </div>
                    <p className="text-sm mt-1">{ev.eventDescription}</p>
                    {(ev.ipAddress || ev.userAgent) && (
                      <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                        {ev.ipAddress && <>IP {ev.ipAddress}</>}
                        {ev.ipAddress && ev.userAgent && ' · '}
                        {ev.userAgent && <>UA {ev.userAgent.slice(0, 80)}</>}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="font-semibold">Sign Platform</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function Card({
  title, icon: Icon, children,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-2xl">
      <div className="p-4 border-b flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{children}</dd>
    </div>
  );
}
