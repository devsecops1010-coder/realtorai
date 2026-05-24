'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAuthenticated } from '@/lib/auth';

export function MarketingNav() {
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={
        scrolled
          ? 'sticky top-0 z-50 w-full glass border-b transition-all'
          : 'sticky top-0 z-50 w-full bg-transparent transition-all'
      }
    >
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg group">
          {/* Logo chip uses the brand gradient so it reads as "Realtorai
              brand" rather than a flat color block. Shadow-glow on hover
              gives a tactile micro-reward. */}
          <div className="h-8 w-8 rounded-lg bg-[linear-gradient(135deg,hsl(var(--grad-from))_0%,hsl(var(--grad-to))_100%)] grid place-items-center shadow-soft group-hover:shadow-glow transition-shadow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          Realtorai
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/#marketplace">חיפוש נכסים</NavLink>
          <NavLink href="#features">יכולות</NavLink>
          <NavLink href="#how">איך זה עובד</NavLink>
          <NavLink href="/pricing">מחירים</NavLink>
          <NavLink href="#faq">שאלות נפוצות</NavLink>
          <NavLink href="#contact">צור קשר</NavLink>
        </div>

        <div className="flex items-center gap-2">
          {authed ? (
            <Button asChild className="btn-shine">
              <Link href="/dashboard">מעבר לדשבורד ←</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">התחבר</Link>
              </Button>
              <Button asChild className="btn-shine shadow-glow">
                <Link href="/#marketplace">חפש נכס ←</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  );
}
