'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * /reset/[token] — landing page for the link in the reset email.
 * Single-step: set a new password. On success, all existing sessions are
 * revoked server-side, so the user is redirected to /login.
 */
export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('הסיסמה חייבת להיות לפחות 8 תווים');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('הסיסמה חייבת לכלול אות וספרה');
      return;
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setSubmitting(true);
    try {
      await api(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: { password },
        skipAuth: true,
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const e = err as ApiError;
      setError(
        e.status === 404 || e.status === 400
          ? 'הקישור לא תקין, פג תוקף, או כבר נוצל'
          : e.message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative grid place-items-center p-4 bg-mesh">
      <Link
        href="/login"
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        חזרה להתחברות
      </Link>

      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">Realtorai</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">בחר/י סיסמה חדשה</h1>
        </div>

        <div className="glass border rounded-2xl p-8 shadow-lift">
          {done ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-medium">הסיסמה אופסה בהצלחה</p>
              <p className="text-sm text-muted-foreground">
                כל הסשנים הקודמים בוטלו. מעביר אותך להתחברות...
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
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
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}
              <Button type="submit" disabled={submitting} className="w-full h-11 btn-shine gap-2" size="lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                אפס סיסמה
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                כל הסשנים הפתוחים יבוטלו אחרי איפוס.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
