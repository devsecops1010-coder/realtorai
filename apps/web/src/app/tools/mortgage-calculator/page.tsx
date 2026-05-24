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

type MortgageSearchParams = {
  price?: string | string[];
  down?: string | string[];
  downPayment?: string | string[];
  equity?: string | string[];
  scenario?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseMoneyParam(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw) return undefined;
  const numeric = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined;
}

function parseScenarioParam(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw === 'single' || raw === 'replacement' || raw === 'investor' ? raw : undefined;
}

export default async function MortgageCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<MortgageSearchParams>;
}) {
  const params = await searchParams;
  const initialPrice = parseMoneyParam(params.price);
  const requestedDownPayment = parseMoneyParam(params.down ?? params.downPayment ?? params.equity);
  const initialDownPayment =
    initialPrice && requestedDownPayment ? Math.min(requestedDownPayment, initialPrice) : requestedDownPayment;
  const initialScenario = parseScenarioParam(params.scenario);

  return (
    <>
      <MarketingNav />
      <main className="container mx-auto max-w-7xl px-4 py-12">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">מחשבון משכנתא</h1>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            תמהילים, מסלולים, מדד, גרייס, שינוי ריבית, סילוק עתידי, לוח סילוקין מלא והשוואה בין הצעות.
          </p>
          {initialPrice && (
            <p className="mt-2 text-sm font-medium text-primary">
              נטען לפי מחיר נכס: {new Intl.NumberFormat('he-IL', {
                style: 'currency',
                currency: 'ILS',
                maximumFractionDigits: 0,
              }).format(initialPrice)}
            </p>
          )}
        </header>

        <MortgageCalculator
          initialPrice={initialPrice}
          initialDownPayment={initialDownPayment}
          initialScenario={initialScenario}
        />

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
