'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });
      saveAuth(res.tokens, res.user);
      router.push('/dashboard');
    } catch (err) {
      const e = err as ApiError;
      setError(e.status === 401 ? 'אימייל או סיסמה לא נכונים' : e.message);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold tracking-tight">ברוך/ה השב/ה</h1>
          <p className="text-muted-foreground mt-2">המשך לדשבורד שלך</p>
        </div>

        <div className="glass border rounded-2xl p-8 shadow-lift">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                dir="ltr"
                placeholder="you@office.co.il"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">סיסמה</Label>
                <Link href="/forgot" className="text-xs text-muted-foreground hover:text-primary">
                  שכחת?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 btn-shine" size="lg">
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          אין לך חשבון?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            הרשם משרד חדש →
          </Link>
        </p>
      </div>
    </div>
  );
}
