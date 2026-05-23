'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, Home, RotateCw } from 'lucide-react';

/**
 * Next.js global error boundary. Renders for any uncaught error in a server
 * or client component (excluding the root layout — those go to global-error.tsx
 * which we don't customize).
 *
 * Must be a client component per Next.js spec.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to Sentry / log aggregator when available. Sentry's SDK
    // already hooks the global error handler, so this is mostly defensive
    // in case it's misconfigured.
    // eslint-disable-next-line no-console
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-20 w-20 rounded-full bg-rose-100 grid place-items-center mb-6">
          <AlertOctagon className="h-10 w-10 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold">שגיאה לא צפויה</h1>
        <p className="text-muted-foreground mt-2">
          משהו השתבש בצד שלנו. הצוות שלנו מקבל התראה אוטומטית — אתה מוזמן לנסות שוב או
          לחזור לדף הבית.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-3" dir="ltr">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <RotateCw className="h-4 w-4" />
            נסה שוב
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
