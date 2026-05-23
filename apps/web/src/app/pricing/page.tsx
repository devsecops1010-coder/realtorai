import { MarketingNav } from '@/components/marketing/nav';
import { PricingSection } from '@/components/marketing/pricing-section';
import { FAQ } from '@/components/marketing/faq';
import { ContactForm } from '@/components/marketing/contact-form';
import { Footer } from '@/components/marketing/footer';
import { RoiCalculator } from '@/components/marketing/roi-calculator';

export const metadata = {
  title: 'מחירים | Realtorai',
  description: 'תוכניות תמחור למערכת סוכני AI למשרדי תיווך: Starter, Pro, Network.',
};

export default function PricingPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-8">
        <div className="container mx-auto px-4 text-center max-w-3xl mb-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            תמחור לפי משרד, נפח שימוש ורמת ליווי
          </h1>
          <p className="text-lg text-muted-foreground">
            מתחילים עם חבילה ברורה, מוסיפים דקות והודעות לפי שימוש, ומודדים רווחיות לכל משרד.
          </p>
        </div>
        <PricingSection heading="" subheading="" />
        <RoiCalculator />
        <FAQ />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
