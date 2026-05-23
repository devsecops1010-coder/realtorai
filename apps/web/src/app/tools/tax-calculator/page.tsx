import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';
import { TaxCalculator } from '@/components/tools/tax-calculator';

export const metadata: Metadata = {
  title: 'מחשבון מס רכישה | Realtorai',
  description: 'מחשבון מס רכישה ישראלי — דירה יחידה ומשקיע. מעודכן ל-2026.',
};

/**
 * Public utility page. The tax calculator is a marketing magnet — buyers
 * Google "מחשבון מס רכישה" thousands of times a month. Owning the answer
 * earns us inbound traffic without paid ads.
 *
 * The calculator itself lives in a client component because it's fully
 * interactive; the server-rendered shell carries the SEO metadata + nav.
 */
export default function TaxCalculatorPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">מחשבון מס רכישה</h1>
          <p className="text-muted-foreground">
            מחשבון מהיר למס רכישה לדירה בישראל. מבוסס על מדרגות המס המעודכנות
            (תקפות לשנת 2026, מעודכן בינואר כל שנה).
          </p>
        </header>
        <TaxCalculator />
      </main>
      <Footer />
    </>
  );
}
