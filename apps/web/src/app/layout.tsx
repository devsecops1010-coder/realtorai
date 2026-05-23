import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import { Toaster } from 'sonner';
import { CookieConsent } from '@/components/cookie-consent';
import './globals.css';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Realtorai',
  description: 'פלטפורמת AI לניהול לידים ונכסים למשרדי תיווך',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased min-h-screen bg-background">
        {children}
        {/* Global toast container. Positioned bottom-right; RTL-aware via
            dir="rtl" on <html>. richColors gives success/error sane palettes. */}
        <Toaster position="bottom-right" richColors closeButton />
        {/* Cookie banner — only renders for first-time visitors who haven't
            acknowledged. Stored in localStorage so it survives refresh
            without itself needing consent. */}
        <CookieConsent />
      </body>
    </html>
  );
}
