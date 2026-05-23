import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import { Toaster } from 'sonner';
import { CookieConsent } from '@/components/cookie-consent';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { ChatWidget } from '@/components/chat/chat-widget';
import './globals.css';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Realtorai',
  description: 'פלטפורמת AI לניהול לידים ונכסים למשרדי תיווך',
  // The manifest enables "Add to Home Screen" / "Install app" prompts in
  // Chromium-based browsers and modern Safari (16.4+).
  manifest: '/manifest.webmanifest',
  // Apple still wants explicit meta — Next composes these into the right
  // <link>/<meta> tags.
  appleWebApp: {
    capable: true,
    title: 'Realtorai',
    statusBarStyle: 'black-translucent',
  },
  // Plain `icons.apple` accepts an SVG; iOS will fall back gracefully if
  // unsupported and use the start_url page's default behavior.
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon.svg' }],
  },
};

// Themed status bar + chrome on installed PWA + mobile browser tabs.
// Splitting from `metadata` is the Next 15 contract — putting it back in
// `metadata.themeColor` works but logs a deprecation warning at build.
export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  // Allow zoom on the leads/properties tables — they're data-dense and an
  // operator on a phone may need to pinch in. Disabling user-scalable is
  // the accessibility footgun we want to avoid.
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
        {/* Registers /sw.js for PWA + push. Renders nothing visible. */}
        <ServiceWorkerRegister />
        {/* Crisp / similar live-chat widget. No-op unless
            NEXT_PUBLIC_CRISP_WEBSITE_ID is set. Loads from the marketing
            CDN so it doesn't add to our bundle. */}
        <ChatWidget />
      </body>
    </html>
  );
}
