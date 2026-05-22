import { MarketingNav } from '@/components/marketing/nav';
import { PricingSection } from '@/components/marketing/pricing-section';
import { FAQ } from '@/components/marketing/faq';
import { ContactForm } from '@/components/marketing/contact-form';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: 'מחירים | Realtorai',
  description: 'תוכניות תמחור — Starter, Pro, Network. ללא התחייבות, 30 יום ניסיון.',
};

export default function PricingPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-8">
        <div className="container mx-auto px-4 text-center max-w-3xl mb-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            כמה זה עולה?
          </h1>
          <p className="text-lg text-muted-foreground">
            תמחור פשוט, ללא הפתעות. ללא התחייבות.
          </p>
        </div>
        <PricingSection heading="" subheading="" />
        <FAQ />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
