import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicMarketplace } from '@/components/marketplace/public-marketplace';

export const metadata: Metadata = {
  title: 'חיפוש נכסים בישראל | Realtorai',
  description:
    'Marketplace נדל"ן עצמאי עם נכסים ממשרדי תיווך, מפה חיה, מועדפים, השוואת נכסים ופנייה ישירה למשרד.',
};

export default function MarketplacePage() {
  return (
    // Suspense boundary is required by Next 15 around any tree that
    // calls `useSearchParams()` — the marketplace now hydrates its
    // filters from `?city=…&q=…&dealType=…` on first render so the
    // hero search can deep-link to a pre-filtered view.
    <Suspense fallback={<div className="container mx-auto px-4 py-10 text-muted-foreground">טוען...</div>}>
      <PublicMarketplace mode="page" />
    </Suspense>
  );
}
