'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      saveAuth(res.tokens, res.user);
      router.push('/dashboard');
    } catch (err) {
      const e = err as ApiError;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>רישום משרד חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tenantName">שם הסוכנות</Label>
              <Input id="tenantName" value={form.tenantName} onChange={(e) => set('tenantName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officeName">שם המשרד</Label>
              <Input id="officeName" value={form.officeName} onChange={(e) => set('officeName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">עיר</Label>
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">שם מלא של בעל המשרד</Label>
              <Input id="ownerName" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה (8+ תווים, אות וספרה)</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required dir="ltr" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'רושם...' : 'הרשם'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              יש לך כבר חשבון?{' '}
              <Link href="/login" className="text-primary hover:underline">
                התחבר
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
