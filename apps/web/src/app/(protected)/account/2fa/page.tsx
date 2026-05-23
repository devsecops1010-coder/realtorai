'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth';

/**
 * Self-service 2FA settings page. Three modes:
 *
 *   - Disabled (default): "Enable 2FA" button → shows QR + secret.
 *   - Enrolling: user scans QR, types 6-digit code, confirms. Shows
 *     one-time recovery codes on success.
 *   - Enabled: "Disable 2FA" button → confirmation flow (current code
 *     required) before stripping the secret.
 */
export default function Account2faPage() {
  const me = getCurrentUser();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'view' | 'enroll' | 'show-recovery' | 'disable'>('view');
  const [secret, setSecret] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await api<{ enabled: boolean }>('/auth/2fa/status', { method: 'POST' });
      setEnabled(res.enabled);
    } catch {
      setEnabled(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startEnrollment() {
    setBusy(true);
    try {
      const res = await api<{ secret: string; otpAuthUrl: string; qrCodeDataUrl: string }>(
        '/auth/2fa/enroll/start',
        { method: 'POST' },
      );
      setSecret(res.secret);
      setQrUrl(res.qrCodeDataUrl);
      setMode('enroll');
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!secret) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error('הקוד חייב להיות 6 ספרות');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ recoveryCodes: string[] }>('/auth/2fa/enroll/confirm', {
        method: 'POST',
        body: { secret, code },
      });
      setRecoveryCodes(res.recoveryCodes);
      setMode('show-recovery');
      setCode('');
      await refresh();
      toast.success('2FA הופעל בהצלחה');
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function doDisable() {
    if (!code.trim()) {
      toast.error('הזן קוד 2FA או קוד שחזור');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/2fa', { method: 'DELETE', body: { code: code.trim() } });
      toast.success('2FA הושבת');
      setMode('view');
      setCode('');
      await refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  function copyRecoveryCodes() {
    void navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (enabled === null) {
    return <div className="text-muted-foreground">טוען…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לדשבורד
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          אימות דו-שלבי (2FA)
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          הוסף שכבת אבטחה — אחרי הסיסמה תידרש להזין קוד מתחלף מאפליקציה כמו Google
          Authenticator, Authy, או 1Password.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              {enabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  2FA פעיל
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  2FA לא פעיל
                </>
              )}
            </span>
            <Badge variant={enabled ? 'success' : 'outline'}>{me?.email}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === 'view' && !enabled && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                מומלץ לכל בעלי הרשאות ניהול. במיוחד למשתמשי <code>platform_owner</code> /
                <code>platform_admin</code> שיש להם גישה רחבה.
              </p>
              <Button onClick={startEnrollment} disabled={busy}>
                <Shield className="h-4 w-4 ml-1.5" />
                הפעלת 2FA
              </Button>
            </div>
          )}

          {mode === 'view' && enabled && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">2FA פעיל בחשבון. בכניסה הבאה תידרש להזין קוד.</p>
              <Button variant="destructive" onClick={() => setMode('disable')}>
                <ShieldOff className="h-4 w-4 ml-1.5" />
                השבתה
              </Button>
            </div>
          )}

          {mode === 'enroll' && (
            <div className="space-y-4">
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>פתח את אפליקציית האימות (Google Authenticator, Authy, 1Password וכו׳).</li>
                <li>סרוק את ה-QR למטה (או הקלד את ה-secret ידנית).</li>
                <li>הזן את הקוד בן 6 הספרות שמופיע באפליקציה.</li>
              </ol>
              {qrUrl && (
                // The QR is a data URL — safe to embed. ImgElement on
                // purpose (not Next/Image) since the source is dynamic and
                // we don't want optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR code for TOTP enrollment"
                  className="w-48 h-48 mx-auto border rounded-lg p-2 bg-white"
                />
              )}
              {secret && (
                <div className="rounded-md bg-muted/40 p-3 text-xs font-mono break-all" dir="ltr">
                  <span className="text-muted-foreground">secret: </span>
                  {secret}
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">קוד מהאפליקציה</label>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setMode('view')} disabled={busy}>
                  ביטול
                </Button>
                <Button onClick={confirmEnrollment} disabled={busy}>
                  אישור
                </Button>
              </div>
            </div>
          )}

          {mode === 'show-recovery' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">קודי שחזור — שמור אותם עכשיו</p>
                  <p className="text-xs text-amber-800 mt-1">
                    הקודים מוצגים פעם אחת בלבד. כל קוד שימוש חד-פעמי, מאפשר כניסה גם בלי
                    אפליקציית 2FA (למקרה של אובדן טלפון).
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm" dir="ltr">
                {recoveryCodes.map((c) => (
                  <code key={c} className="rounded bg-muted/40 px-2 py-1 text-center">
                    {c}
                  </code>
                ))}
              </div>
              <Button variant="outline" onClick={copyRecoveryCodes} className="w-full">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 ml-1.5 text-emerald-600" /> הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-1.5" /> העתק את כל הקודים
                  </>
                )}
              </Button>
              <Button onClick={() => { setMode('view'); setRecoveryCodes([]); }} className="w-full">
                סיימתי לשמור
              </Button>
            </div>
          )}

          {mode === 'disable' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                <KeyRound className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">אישור השבתה</p>
                  <p className="text-xs text-amber-800 mt-1">
                    הזן קוד מהאפליקציה (6 ספרות) או קוד שחזור כדי לאשר.
                  </p>
                </div>
              </div>
              <Input
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000 או XXXXX-XXXXX"
                className="text-center font-mono"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setMode('view'); setCode(''); }} disabled={busy}>
                  ביטול
                </Button>
                <Button variant="destructive" onClick={doDisable} disabled={busy}>
                  השבת 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
