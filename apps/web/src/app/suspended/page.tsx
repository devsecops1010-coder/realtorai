'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pause, LogOut, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { clearAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Suspended-account landing page. Reached automatically by the 451 handler
 * in api.ts when any authenticated request hits a guarded endpoint. Tries to
 * fetch /auth/me (which is exempt from the suspension guard) to populate
 * the tenant name + reason.
 */
export default function SuspendedPage() {
  const [me, setMe] = useState<{
    tenant: { name: string; status: string; suspendedReason: string | null; suspendedAt: string | null };
    user: { name: string; email: string };
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // /auth/me is whitelisted on the suspension guard so we can read this
    // even when the tenant is suspended.
    api<typeof me>('/auth/me', { skipAuth: true })
      .then(setMe)
      .catch(() => undefined);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearAuth();
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-background to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-lift">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 grid place-items-center mb-3">
            <Pause className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">החשבון מושעה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {me?.tenant ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                החשבון <strong>{me.tenant.name}</strong> אינו פעיל כרגע ולא ניתן להשתמש במערכת.
              </p>
              {me.tenant.suspendedReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">סיבת ההשעיה</p>
                  <p className="text-sm font-medium">{me.tenant.suspendedReason}</p>
                </div>
              )}
              {me.tenant.suspendedAt && (
                <p className="text-xs text-muted-foreground text-center" dir="ltr">
                  {new Date(me.tenant.suspendedAt).toLocaleString('he-IL')}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              לא ניתן לטעון את פרטי החשבון. ייתכן שהחשבון פג או נמחק.
            </p>
          )}

          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground text-center">
            לפרטים נוספים או לחידוש החשבון, פנו אלינו ב-
            <a href="mailto:support@realtorai.local" className="text-primary underline">
              support@realtorai.local
            </a>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@realtorai.local">
                <Mail className="h-4 w-4 ml-2" />
                שלח אימייל לתמיכה
              </a>
            </Button>
            <Button variant="ghost" className="w-full" disabled={loggingOut} onClick={logout}>
              <LogOut className="h-4 w-4 ml-2" />
              התנתקות
            </Button>
            <Link href="/" className="text-xs text-center text-muted-foreground hover:underline">
              חזרה לדף הבית
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
