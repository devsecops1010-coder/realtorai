'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSignature, Plus, Upload, ArrowLeft, CheckCircle2, Clock, AlertCircle, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiUrl, ApiError, csrfHeaders } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BankAuthDialog } from './bank-auth-dialog';

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
}

interface Props {
  /**
   * Either `leadId` or `propertyId` must be set. The card filters /sign/documents
   * by that key and pre-attaches the same key on upload, so the new document is
   * automatically linked to this lead/property.
   */
  leadId?: string;
  propertyId?: string;
  /** Pre-fill the signer form when we know who the counterparty is. */
  defaultSignerName?: string;
  defaultSignerEmail?: string;
  /** Pre-fill phone when known (currently informational only — backend stores it). */
  defaultSignerPhone?: string;
  /** Card title — defaults to "מסמכים לחתימה". */
  title?: string;
}

/**
 * Drop-in card for any CRM detail page (lead, property) that lists this
 * entity's documents and offers a one-shot "upload + send for signing" flow.
 *
 * Why one component instead of two: lead and property pages have identical
 * needs — list of related sign docs, plus a button that uploads a PDF and
 * immediately creates a signature request. The only difference is which FK
 * we attach on upload.
 */
export function SignatureRequestsCard({
  leadId,
  propertyId,
  defaultSignerName = '',
  defaultSignerEmail = '',
  defaultSignerPhone = '',
  title = 'מסמכים לחתימה',
}: Props) {
  const [docs, setDocs] = useState<SignDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [signerPhone, setSignerPhone] = useState(defaultSignerPhone);

  // Keep dialog state in sync with parent prop changes (the lead detail page
  // may resolve after this card mounts).
  useEffect(() => {
    setSignerName(defaultSignerName);
    setSignerEmail(defaultSignerEmail);
    setSignerPhone(defaultSignerPhone);
  }, [defaultSignerName, defaultSignerEmail, defaultSignerPhone]);

  const filterParam = leadId
    ? `leadId=${encodeURIComponent(leadId)}`
    : propertyId
      ? `propertyId=${encodeURIComponent(propertyId)}`
      : '';

  async function load() {
    if (!filterParam) return;
    setLoading(true);
    try {
      const list = await api<SignDoc[]>(`/sign/documents?${filterParam}`);
      setDocs(list);
    } catch {
      // 403/404 silently — the card is optional. The Sign module may not be
      // enabled for this tenant.
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [leadId, propertyId]);

  async function handleSend() {
    if (!file) {
      toast.error('יש לבחור קובץ PDF');
      return;
    }
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('יש למלא שם + אימייל של החותם');
      return;
    }
    setBusy(true);
    try {
      // Step 1: upload the PDF — the multipart endpoint accepts leadId /
      // propertyId in the same form body.
      const fd = new FormData();
      fd.append('file', file);
      if (leadId) fd.append('leadId', leadId);
      if (propertyId) fd.append('propertyId', propertyId);

      const uploadRes = await fetch(`${apiUrl}/sign/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        // Multipart upload — we can't use api() (which forces JSON), so we
        // attach the CSRF header manually via the shared helper.
        headers: csrfHeaders(),
        body: fd,
      });
      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new ApiError(uploadRes.status, text || 'העלאה נכשלה');
      }
      const doc = (await uploadRes.json()) as SignDoc;

      // Step 2: create the signature request — sends the email automatically.
      await api(`/sign/signature-requests`, {
        method: 'POST',
        body: {
          documentId: doc.id,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signerPhone: signerPhone.trim() || undefined,
        },
      });

      toast.success('המסמך נשלח לחתימה');
      setShowDialog(false);
      setFile(null);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error(`שליחה נכשלה: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            {title}
            {docs.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {docs.length}
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            {leadId && (
              // Bank-template flow only makes sense for a lead (the borrower).
              // Property-only contexts use the generic upload dialog instead.
              <Button size="sm" variant="outline" onClick={() => setShowBankDialog(true)}>
                <Building2 className="h-3.5 w-3.5 ml-1.5" />
                כתב הסמכה לבנק
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
              <Plus className="h-3.5 w-3.5 ml-1.5" />
              שליחה לחתימה
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-2">טוען…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">אין מסמכים. לחץ "שליחה לחתימה" כדי להתחיל.</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-accent/50 transition group"
              >
                <StatusIcon status={d.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.originalFileName}</p>
                  {d.signatureRequest && (
                    <p className="text-xs text-muted-foreground truncate">
                      {d.signatureRequest.signerName} · {d.signatureRequest.signerEmail}
                    </p>
                  )}
                </div>
                <StatusBadge status={d.status} />
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary mt-1 transition" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setShowDialog(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-background border shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">שליחת מסמך לחתימה</h2>
              <button
                type="button"
                onClick={() => !busy && setShowDialog(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="סגירה"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">קובץ PDF</label>
                <label className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-3 cursor-pointer hover:border-muted-foreground/40 transition">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">
                    {file ? file.name : 'בחר קובץ PDF (עד 25MB)'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">שם החותם</label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">אימייל החותם</label>
                <Input
                  dir="ltr"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">טלפון (אופציונלי)</label>
                <Input
                  dir="ltr"
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                  placeholder="052-..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button size="sm" disabled={busy} onClick={handleSend}>
                {busy ? 'שולח…' : 'שלח לחתימה'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBankDialog && leadId && (
        <BankAuthDialog
          leadId={leadId}
          onCreated={(_docId) => {
            // After the bank template is saved as a draft, refresh the list
            // so the new doc appears immediately. The user then clicks
            // through to /documents/[id] to send it for signing.
            setShowBankDialog(false);
            void load();
          }}
          onClose={() => setShowBankDialog(false)}
        />
      )}
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'signed' || status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-1 shrink-0" />;
  }
  if (status === 'cancelled' || status === 'expired') {
    return <AlertCircle className="h-4 w-4 text-rose-600 mt-1 shrink-0" />;
  }
  return <Clock className="h-4 w-4 text-amber-600 mt-1 shrink-0" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'outline' | 'destructive' | 'secondary' }> = {
    draft: { label: 'טיוטה', variant: 'outline' },
    sent: { label: 'נשלח', variant: 'secondary' },
    viewed: { label: 'נצפה', variant: 'secondary' },
    signed: { label: 'נחתם', variant: 'success' },
    completed: { label: 'הושלם', variant: 'success' },
    cancelled: { label: 'בוטל', variant: 'destructive' },
    expired: { label: 'פג תוקף', variant: 'destructive' },
  };
  const m = map[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge variant={m.variant} className="text-[10px] whitespace-nowrap">
      {m.label}
    </Badge>
  );
}
