'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Loader2, Send } from 'lucide-react';
import { apiUrl, ApiError, csrfHeaders } from '@/lib/api';

/**
 * Two-step page: (1) upload PDF → returns documentId,
 * (2) create signature_request with signer details → sends the email.
 */
export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [signer, setSigner] = useState({ name: '', email: '', phone: '' });
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${apiUrl}/sign/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        // Multipart upload: no JSON body, but we still need the double-submit
        // CSRF token in the header — otherwise the CsrfMiddleware rejects with
        // "CSRF token missing".
        headers: csrfHeaders(),
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`, body);
      }
      const json = (await res.json()) as { id: string };
      setDocId(json.id);
      toast.success('המסמך הועלה. הוסף פרטי חותם ושלח.');
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setUploading(false);
    }
  }

  async function createRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!docId) return;
    setSending(true);
    try {
      const res = await fetch(`${apiUrl}/sign/signature-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          documentId: docId,
          signerName: signer.name,
          signerEmail: signer.email,
          signerPhone: signer.phone || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body?.message ?? `HTTP ${res.status}`, body);
      }
      toast.success(`קישור החתימה נשלח ל-${signer.email}`);
      router.push('/dashboard');
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-start py-10 px-4 bg-muted/30">
      <main className="w-full max-w-xl bg-white rounded-2xl border shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6">העלאת מסמך לחתימה</h1>

        {!docId ? (
          <form onSubmit={upload} className="space-y-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="block w-full text-sm border rounded-lg p-2"
            />
            <button
              disabled={!file || uploading}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-medium inline-flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              העלה PDF
            </button>
          </form>
        ) : (
          <form onSubmit={createRequest} className="space-y-4">
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
              המסמך הועלה. עכשיו הזן/הזיני פרטי חותם.
            </p>
            <Field label="שם חותם" value={signer.name} onChange={(v) => setSigner((s) => ({ ...s, name: v }))} />
            <Field label="אימייל חותם" value={signer.email} onChange={(v) => setSigner((s) => ({ ...s, email: v }))} type="email" dir="ltr" />
            <Field label="טלפון (אופציונלי)" value={signer.phone} onChange={(v) => setSigner((s) => ({ ...s, phone: v }))} dir="ltr" required={false} />
            <button
              disabled={sending}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-medium inline-flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              שלח קישור חתימה
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', dir, required = true,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; dir?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        dir={dir}
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
