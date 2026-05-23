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
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4">
      <div className="mx-auto max-w-4xl rounded-xl bg-card border shadow-lift p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <Cookie className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="text-sm flex-1">
          <p className="font-semibold">אנחנו משתמשים ב-Cookies</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            רק עוגיות הכרחיות לתפעול המערכת (התחברות, אבטחה). אין מעקב פרסומי.{' '}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              מדיניות פרטיות
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={accept}>
            הבנתי
          </Button>
          <button
            type="button"
            onClick={accept}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="סגירה"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
