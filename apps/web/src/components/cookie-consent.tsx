'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'rai_cookie_consent_v1';

/**
 * Cookie consent banner — bottom-fixed, dismissible.
 *
 * Israeli privacy law (חוק הגנת הפרטיות, after the 2024 amendments) and
 * EU GDPR both require informed consent before setting non-essential
 * cookies. We use only first-party cookies for auth + CSRF (strictly
 * necessary, no consent required), so this is more of a legal "we use
 * cookies" notice than a granular accept/reject UI.
 *
 * Stored in localStorage (not a cookie) so it persists across re-visits
 * without itself requiring consent.
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't render server-side — localStorage is only available on the
    // client. Also use a tiny timeout so the banner doesn't flash on
    // already-consented users.
    const t = setTimeout(() => {
      try {
        const accepted = localStorage.getItem(STORAGE_KEY);
        if (!accepted) setShow(true);
      } catch {
        // localStorage blocked (private mode etc) — show the banner; the
        // dismiss action will fail silently and re-show next visit.
        setShow(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 sm:right-auto sm:w-[380px]">
      <div className="rounded-lg border bg-card/95 p-3 shadow-lift backdrop-blur">
        <div className="flex items-start gap-2.5">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5">Cookies הכרחיים בלבד</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              התחברות ואבטחה בלבד, ללא מעקב פרסומי.{' '}
              <Link href="/legal/privacy" className="text-primary hover:underline">
                פרטיות
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={accept}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="סגירה"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button size="sm" onClick={accept} className="mt-2 h-8 w-full">
          הבנתי
        </Button>
      </div>
    </div>
  );
}
