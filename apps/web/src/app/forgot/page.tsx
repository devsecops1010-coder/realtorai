'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * /forgot — request a password-reset email.
 *
 * The API always returns 204 regardless of whether the email exists, to
 * prevent user enumeration. So the success message is always shown after
 * submit — even for unknown emails.
 */
export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: { email },
        skipAuth: true,
      });
      setSent(true);
    } catch (err) {
      const e = err as ApiError;
      // 429 is the only meaningful error here — everything else returns 204
      // by design. Show a friendly hint if rate-limited.
      setError(
        e.status === 429
          ? 'יותר מדי ניסיונות. נסה שוב בעוד דקה.'
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
          <h1 className="text-3xl font-bold tracking-tight">איפוס סיסמה</h1>
          <p className="text-muted-foreground mt-2">
            הזן/הזיני את האימייל שלך ונשלח קישור לאיפוס הסיסמה
          </p>
        </div>

        <div className="glass border rounded-2xl p-8 shadow-lift">
          {sent ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-medium">אם האימייל קיים במערכת, נשלח קישור</p>
              <p className="text-sm text-muted-foreground">
                בדוק/בדקי את התיבה (וגם את תיקיית הספאם). הקישור תקף שעה אחת.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                לדף ההתחברות
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@office.co.il"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}
              <Button type="submit" disabled={submitting} className="w-full h-11 btn-shine gap-2" size="lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                שלח קישור איפוס
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                לא נחשוף אם האימייל קיים — אם הוא קיים, הקישור יישלח.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
