import { Suspense } from 'react';
import { MarketingNav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { PublicMarketplace } from '@/components/marketplace/public-marketplace';
import { PainPoints } from '@/components/marketing/pain-points';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Features } from '@/components/marketing/features';
import { DemoVideo } from '@/components/marketing/demo-video';
import { Testimonials } from '@/components/marketing/testimonials';
import { ToolsCallout } from '@/components/marketing/tools-callout';
import { PricingSection } from '@/components/marketing/pricing-section';
import { FAQ } from '@/components/marketing/faq';
import { ContactForm } from '@/components/marketing/contact-form';
import { CtaBand } from '@/components/marketing/cta-band';
import { Footer } from '@/components/marketing/footer';

// Landing-page composition. Order is conversion-driven: problem → solution
// → proof → price → cta. Demo video sits after Features and before
// Testimonials so prospects who scrolled through the value prop can see it
// in motion before reading social proof.
export default function HomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        {/* useSearchParams() inside the marketplace requires a Suspense
            boundary in Next 15 — without it the home prerender fails. */}
        <Suspense fallback={null}>
          <PublicMarketplace />
        </Suspense>
        <PainPoints />
        <HowItWorks />
        <Features />
        <DemoVideo />
        <Testimonials />
        <PricingSection />
        <FAQ />
        <ToolsCallout />
        <CtaBand />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
