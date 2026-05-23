'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ActivationPreview {
  email: string;
  name: string;
}

/**
 * /activate/[token] — landing page for the link in the invitation email.
 * On mount we preview the token (GET) to confirm it's valid + look up the
 * invitee's name; the user then submits a new password (POST), which
 * activates the account and lands them on /login.
 */
export default function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState<ActivationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<ActivationPreview>(`/auth/activate/${token}`, { skipAuth: true })
      .then(setPreview)
      .catch((err) => {
        const e = err as ApiError;
        setPreviewError(
          e.status === 404
            ? 'הקישור לא תקין או שכבר נוצל'
            : e.status === 400
              ? 'הקישור פג תוקף או כבר נוצל'
              : e.message,
        );
      });
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (password.length < 8) {
      setSubmitError('הסיסמה חייבת להיות לפחות 8 תווים');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setSubmitError('הסיסמה חייבת לכלול אות וספרה');
      return;
    }
    if (password !== confirm) {
      setSubmitError('הסיסמאות אינן תואמות');
      return;
    }
    setSubmitting(true);
    try {
      await api(`/auth/activate/${token}`, {
        method: 'POST',
        body: { password },
        skipAuth: true,
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setSubmitError((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative grid place-items-center p-4 bg-mesh">
      <Link
        href="/"
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        חזרה לאתר
      </Link>

      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">Realtorai</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">הפעלת חשבון</h1>
          <p className="text-muted-foreground mt-2">בחר/י סיסמה חזקה והתחבר/י לראשונה</p>
        </div>

        <div className="glass border rounded-2xl p-8 shadow-lift">
          {previewError ? (
            <div className="text-center space-y-3">
              <p className="text-destructive font-medium">{previewError}</p>
              <p className="text-sm text-muted-foreground">
                בקש/י מבעל המשרד לשלוח הזמנה חדשה.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" />
                לדף ההתחברות
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-medium">החשבון הופעל בהצלחה</p>
              <p className="text-sm text-muted-foreground">מעביר אותך לדף ההתחברות...</p>
            </div>
          ) : !preview ? (
            <div className="text-center text-muted-foreground py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground text-xs">מפעיל/ה חשבון עבור</p>
                <p className="font-medium">{preview.name}</p>
                <p className="text-muted-foreground" dir="ltr">{preview.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה חדשה</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">אישור סיסמה</Label>
                <Input
                  id="confirm"
                  type="password"
                  dir="ltr"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {submitError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{submitError}</p>
              )}
              <Button type="submit" disabled={submitting} className="w-full h-11 btn-shine gap-2" size="lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                הפעל חשבון
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                לפחות 8 תווים, אות אחת וספרה אחת
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
