import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CtaBand() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          הליד הבא שאת/ה מאבד/ת — שווה את כל המנוי
        </h2>
        <p className="text-lg opacity-90 mb-8">
          סוכן AI שמטפל אוטומטית בכל ליד חדש. ב-30 יום הראשונים — בחינם, ללא התחייבות.
        </p>
        <Button asChild size="lg" variant="secondary" className="text-base">
          <Link href="/register">
            התחל ניסיון חינם
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
