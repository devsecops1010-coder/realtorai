import { MarketingNav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { PublicMarketplace } from '@/components/marketplace/public-marketplace';
import { PainPoints } from '@/components/marketing/pain-points';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Features } from '@/components/marketing/features';
import { PricingSection } from '@/components/marketing/pricing-section';
import { FAQ } from '@/components/marketing/faq';
import { ContactForm } from '@/components/marketing/contact-form';
import { CtaBand } from '@/components/marketing/cta-band';
import { Footer } from '@/components/marketing/footer';

export default function HomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <PublicMarketplace />
        <PainPoints />
        <HowItWorks />
        <Features />
        <PricingSection />
        <FAQ />
        <CtaBand />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
