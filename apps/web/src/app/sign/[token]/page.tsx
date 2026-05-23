'use client';

import { use, useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { toast } from 'sonner';
import { FileText, ShieldCheck, Loader2, CheckCircle2, Eraser } from 'lucide-react';
import { api, apiUrl, ApiError } from '@/lib/api';

interface Preview {
  signerName: string;
  signerEmailMasked: string;
  documentName: string;
  organizationName: string;
  otpVerified: boolean;
  status: string;
}

type Step = 'otp_request' | 'otp_verify' | 'review' | 'sign' | 'done' | 'error';

/**
 * /sign/[token] — public signing page. State machine:
 *   1. Fetch preview (auto). If OTP already verified → skip to review.
 *   2. User clicks "send code" → POST /send-otp.
 *   3. User enters OTP → POST /verify-otp.
 *   4. PDF embeds via <object>; canvas signature pad below it.
 *   5. Consent checkbox + submit → POST /submit-signature.
 *
 * The PDF is fetched from /public/sign/:token/document which requires the
 * verified OTP (cookies / verifiedAt). We use `<iframe>` for max
 * compatibility instead of pulling in react-pdf-viewer in MVP.
 */
export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [step, setStep] = useState<Step>('otp_request');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [signed, setSigned] = useState<{ at: string; hash: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  // Initial fetch
  useEffect(() => {
    api<Preview>(`/sign/public/sign/${token}`)
      .then((p) => {
        setPreview(p);
        if (p.status === 'signed') {
          setStep('done');
        } else if (p.otpVerified) {
          setStep('review');
        } else {
          setStep('otp_request');
        }
      })
      .catch((err) => {
        const e = err as ApiError;
        setErrorMsg(
          e.status === 404
            ? 'הקישור לא תקין'
            : e.status === 403
              ? 'הקישור פג תוקף או בוטל'
              : e.message,
        );
        setStep('error');
      });
  }, [token]);

  // Initialize signature pad once we land on the sign step.
  useEffect(() => {
    if (step !== 'sign' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      padRef.current?.clear();
    };
    padRef.current = new SignaturePad(canvas, {
      penColor: '#0f172a',
      backgroundColor: 'rgba(255,255,255,0)',
    });
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      padRef.current?.off();
    };
  }, [step]);

  async function sendOtp() {
    setSending(true);
    try {
      await api(`/sign/public/sign/${token}/send-otp`, { method: 'POST', body: {} });
      toast.success('הקוד נשלח לאימייל שלך');
      setStep('otp_verify');
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      toast.error('קוד באורך 6 ספרות');
      return;
    }
    setVerifying(true);
    try {
      await api(`/sign/public/sign/${token}/verify-otp`, { method: 'POST', body: { otp } });
      toast.success('זהות אומתה');
      setStep('review');
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setVerifying(false);
    }
  }

  async function submit() {
    if (!consent) {
      toast.error('יש לאשר את ההצהרה');
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error('יש לחתום בתיבה');
      return;
    }
    setSubmitting(true);
    try {
      const signatureImage = padRef.current.toDataURL('image/png');
      const res = await api<{ signedAt: string; signedDocumentHash: string }>(
        `/sign/public/sign/${token}/submit-signature`,
        { method: 'POST', body: { signatureImage, consent: true } },
      );
      setSigned({ at: res.signedAt, hash: res.signedDocumentHash });
      setStep('done');
      toast.success('המסמך נחתם בהצלחה');
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  // --- render ---------------------------------------------------------

  if (step === 'error') {
    return (
      <Shell>
        <div className="text-center py-12">
          <p className="text-destructive font-medium">{errorMsg ?? 'שגיאה'}</p>
        </div>
      </Shell>
    );
  }
  if (!preview) {
    return (
      <Shell>
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-6 pb-6 border-b">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <ShieldCheck className="h-4 w-4" />
          חתימה אלקטרונית מאובטחת
        </div>
        <h1 className="text-2xl font-semibold">{preview.documentName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          נשלח אליך על-ידי <strong>{preview.organizationName}</strong>
        </p>
      </header>

      {step === 'otp_request' && (
        <section className="space-y-4">
          <p>
            שלום <strong>{preview.signerName}</strong>, כדי לחתום על המסמך נשלח קוד אימות
            לאימייל שלך{' '}
            <span dir="ltr" className="font-mono text-sm">{preview.signerEmailMasked}</span>
          </p>
          <button
            onClick={sendOtp}
            disabled={sending}
            className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            שלח לי קוד
          </button>
        </section>
      )}

      {step === 'otp_verify' && (
        <section className="space-y-4">
          <p>הזן/הזיני את הקוד בן 6 הספרות שנשלח לאימייל:</p>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoFocus
            placeholder="000000"
            className="border rounded-lg px-4 py-3 text-2xl tracking-widest text-center font-mono w-48"
            dir="ltr"
          />
          <div className="flex gap-2">
            <button
              onClick={verifyOtp}
              disabled={verifying || otp.length !== 6}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'אמת'}
            </button>
            <button
              onClick={sendOtp}
              disabled={sending}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              שלח שוב
            </button>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="space-y-4">
          <p>אנא קרא/י את המסמך לפני שתחתום/תחתמי.</p>
          <iframe
            src={`${apiUrl}/sign/public/sign/${token}/document`}
            className="w-full h-[60vh] border rounded-lg"
            title="מסמך לחתימה"
          />
          <button
            onClick={() => setStep('sign')}
            className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-medium hover:opacity-90"
          >
            המשך לחתימה
          </button>
        </section>
      )}

      {step === 'sign' && (
        <section className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium mb-1">חתום/חתמי בתיבה למטה:</p>
            <p className="text-muted-foreground text-xs">השתמש/י בעכבר, באצבע או בעט דיגיטלי.</p>
          </div>
          <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
            <canvas ref={canvasRef} className="block w-full h-48 touch-none" />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => padRef.current?.clear()}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Eraser className="h-3.5 w-3.5" />
              נקה
            </button>
          </div>

          <label className="flex items-start gap-2 text-sm border rounded-lg p-3 bg-muted/30">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              אני מאשר/ת שקראתי את המסמך, אני חותם/ת עליו מרצוני, ושהחתימה
              הזו מהווה הסכמתי המחייבת לתוכן המסמך.
            </span>
          </label>

          <button
            onClick={submit}
            disabled={submitting}
            className="bg-primary text-primary-foreground rounded-lg px-6 py-3 font-medium inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            חתום/חתמי על המסמך
          </button>
        </section>
      )}

      {step === 'done' && (
        <section className="text-center py-10 space-y-3">
          <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />
          <h2 className="text-2xl font-semibold">המסמך נחתם בהצלחה</h2>
          <p className="text-muted-foreground text-sm">עותק חתום נשלח גם לאימייל שלך.</p>
          {signed && (
            <div className="mt-4 inline-block text-xs text-muted-foreground bg-muted/40 rounded-md p-3 font-mono" dir="ltr">
              <div>signedAt: {new Date(signed.at).toISOString()}</div>
              <div>hash: {signed.hash.slice(0, 32)}…</div>
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 grid place-items-start py-10 px-4">
      <main className="w-full max-w-2xl bg-white rounded-2xl border shadow-sm p-8">{children}</main>
    </div>
  );
}
