import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

/**
 * Next.js App Router not-found page. Rendered for any route that 404s,
 * including dynamic segments that throw notFound(). RTL Hebrew copy.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 grid place-items-center mb-6">
          <Compass className="h-10 w-10 text-primary" />
        </div>
        <p className="text-6xl font-bold text-muted-foreground/40">404</p>
        <h1 className="text-2xl font-bold mt-2">הדף לא נמצא</h1>
        <p className="text-muted-foreground mt-2">
          הקישור שניסית להגיע אליו לא קיים או הוסר. ייתכן שהורידו את התוכן או שהקלדת
          כתובת שגויה.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            לדף הבית
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            לדשבורד
          </Link>
        </div>
      </div>
    </div>
  );
}
