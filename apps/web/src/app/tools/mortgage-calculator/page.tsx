import Link from 'next/link';
import type { Metadata } from 'next';
import { Calculator } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';
import { MortgageCalculator } from '@/components/tools/mortgage-calculator';

export const metadata: Metadata = {
  title: 'מחשבון משכנתא | Realtorai',
  description:
    'מחשבון משכנתא ישראלי מתקדם עם תמהילים, מסלולים, גרייס, סילוק עתידי, לוחות סילוקין והשוואה.',
};

export default function MortgageCalculatorPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto max-w-7xl px-4 py-12">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">מחשבון משכנתא</h1>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            תמהילים, מסלולים, מדד, גרייס, שינוי ריבית, סילוק עתידי, לוח סילוקין מלא והשוואה בין הצעות.
          </p>
        </header>

        <MortgageCalculator />

        <div className="mt-8 text-center text-sm text-muted-foreground">
          רוצה לחשב גם את מס הרכישה?{' '}
          <Link href="/tools/tax-calculator" className="text-primary hover:underline">
            <Calculator className="h-3.5 w-3.5 inline-block ml-1" />
            מחשבון מס רכישה
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
