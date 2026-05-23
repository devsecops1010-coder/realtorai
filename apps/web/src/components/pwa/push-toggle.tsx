'use client';

// Push notification opt-in toggle. Lives on the account / notifications
// settings page. Walks the user through:
//   1. Asking the browser for Notification permission
//   2. pushManager.subscribe() with the server's VAPID public key
//   3. POST /push/subscribe with the resulting endpoint + keys
//
// The button is hidden entirely if the server hasn't configured VAPID — no
// point teasing a feature that can't deliver. Same for browsers without
// service worker / PushManager support (iOS < 16.4, etc).

import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type State = 'unsupported' | 'unconfigured' | 'denied' | 'idle' | 'subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // VAPID public keys are URL-safe base64; the Push API wants raw bytes.
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [state, setState] = useState<State>('idle');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported');
        return;
      }
      const { publicKey } = await api<{ publicKey: string | null }>('/push/public-key').catch(
        () => ({ publicKey: null }),
      );
      if (!publicKey) {
        setState('unconfigured');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setState(existing ? 'subscribed' : 'idle');
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      // Ask for permission inside the click handler so the browser counts it
      // as a gesture — bare calls outside the gesture get auto-denied.
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('יש לאפשר התראות בדפדפן');
        setState(perm === 'denied' ? 'denied' : 'idle');
        return;
      }

      const { publicKey } = await api<{ publicKey: string | null }>('/push/public-key');
      if (!publicKey) {
        toast.error('שירות התראות אינו זמין');
        setState('unconfigured');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      // The Push API typings (lib.dom) want `BufferSource`, which under
      // TS 5.6 narrows to ArrayBuffer-not-SharedArrayBuffer. Our helper
      // returns a Uint8Array — the underlying buffer is fine at runtime;
      // cast to satisfy the stricter type.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      await api('/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
      });
      setState('subscribed');
      toast.success('התראות הופעלו 🎉');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'הפעלת התראות נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api('/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(
          () => undefined,
        );
        await sub.unsubscribe();
      }
      setState('idle');
      toast.success('התראות הושבתו');
    } catch (e) {
      toast.error('השבתה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  // Hide entirely when the feature isn't available — surface only when the
  // user can actually take action.
  if (state === 'unsupported' || state === 'unconfigured') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-primary" />
          התראות Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          קבל התראה בדפדפן (גם כשהאתר סגור) כשמופיע ליד חם, נכון לפעולה דחופה, או משימה דחופה.
        </p>

        {state === 'denied' && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            ההרשאה נחסמה בדפדפן. בטל את החסימה דרך הגדרות האתר ונסה שוב.
          </p>
        )}

        {state === 'idle' && (
          <Button onClick={enable} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            הפעל התראות
          </Button>
        )}

        {state === 'subscribed' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <BellRing className="h-4 w-4" />
              פעיל במכשיר הזה
            </span>
            <Button variant="outline" size="sm" onClick={disable} disabled={busy} className="gap-1">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellOff className="h-3 w-3" />}
              בטל
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
