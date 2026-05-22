'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { isAuthenticated } from '@/lib/auth';
import { Sparkles } from 'lucide-react';

export function MarketingNav() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Sparkles className="h-6 w-6 text-primary" />
          Realtorai
        </Link>
        <div className="flex items-center gap-2">
          <Link href="#features" className="hidden md:inline-block px-3 py-2 text-sm hover:text-primary">
            יכולות
          </Link>
          <Link href="#how" className="hidden md:inline-block px-3 py-2 text-sm hover:text-primary">
            איך זה עובד
          </Link>
          <Link href="/pricing" className="hidden md:inline-block px-3 py-2 text-sm hover:text-primary">
            מחירים
          </Link>
          <Link href="#contact" className="hidden md:inline-block px-3 py-2 text-sm hover:text-primary">
            יצירת קשר
          </Link>
          {authed ? (
            <Button asChild>
              <Link href="/dashboard">מעבר לדשבורד</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">התחבר</Link>
              </Button>
              <Button asChild>
                <Link href="/register">התחל ניסיון</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
