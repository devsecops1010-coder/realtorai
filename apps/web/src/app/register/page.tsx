'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { saveUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthResponse } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tenantName: '',
    officeName: '',
    ownerName: '',
    email: '',
    password: '',
    city: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm((s) => ({ ...s, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<AuthResponse>('/auth/register-tenant', {
        method: 'POST',
        body: form,
        skipAuth: true,
      });
      saveUser(res.user);
      router.push('/dashboard');
    } catch (err) {
      const e = err as ApiError;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative grid place-items-center p-4 bg-mesh py-12">
      <Link
        href="/"
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        חזרה לאתר
      </Link>

      <div className="w-full max-w-lg animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">Realtorai</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">בואו נתחיל</h1>
          <p className="text-muted-foreground mt-2">
            30 יום ניסיון חינם · ללא כרטיס אשראי · ללא התחייבות
          </p>
        </div>

        <div className="glass border rounded-2xl p-8 shadow-lift">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">שם הסוכנות</Label>
                <Input id="tenantName" value={form.tenantName} onChange={(e) => set('tenantName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeName">שם המשרד</Label>
                <Input id="officeName" value={form.officeName} onChange={(e) => set('officeName', e.target.value)} required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">שם מלא</Label>
                <Input id="ownerName" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">עיר</Label>
                <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="הרצליה, תל אביב..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="you@office.co.il" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" dir="ltr" value={form.password} onChange={(e) => set('password', e.target.value)} required placeholder="לפחות 8 תווים, אות וספרה" />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 btn-shine" size="lg">
              {loading ? 'רושם...' : 'פתח חשבון'}
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          יש לך כבר חשבון?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            התחבר →
          </Link>
        </p>
      </div>
    </div>
  );
}
