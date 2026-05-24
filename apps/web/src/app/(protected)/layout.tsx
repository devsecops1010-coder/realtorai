'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Sparkles, Command as CommandIcon } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/cmd/command-palette';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  // Mobile drawer state. Auto-closes on route change so a click in the
  // drawer doesn't leave it open over the new page.
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (!ready) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Desktop sidebar — always visible at lg+ */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer — overlay sidebar from the right (RTL) */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 lg:hidden animate-in slide-in-from-right">
            <Sidebar />
          </div>
        </>
      )}

      <main className="flex-1 overflow-x-hidden max-w-[1600px] mx-auto w-full">
        {/* Mobile top bar — hamburger + brand + ⌘K hint */}
        <div className="lg:hidden flex items-center justify-between border-b bg-card/80 backdrop-blur sticky top-0 z-30 px-4 py-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="פתח תפריט"
            className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {/* Mobile brand chip — same gradient anchors as the marketing
                nav + sidebar so the brand reads identically on every
                screen size. */}
            <div className="h-7 w-7 rounded-lg bg-[linear-gradient(135deg,hsl(var(--grad-from))_0%,hsl(var(--grad-to))_100%)] grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold">Realtorai</span>
          </div>
          <button
            type="button"
            onClick={() => {
              // Dispatch a synthetic ⌘K so the palette opens via the
              // existing keyboard handler — no need for global state.
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
              );
            }}
            aria-label="פתח חיפוש"
            className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <CommandIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 md:p-10">{children}</div>
      </main>

      {/* Global command palette — listens for ⌘K / Ctrl+K */}
      <CommandPalette />
    </div>
  );
}
