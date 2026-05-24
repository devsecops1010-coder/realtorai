import { PublicMarketplace } from '@/components/marketplace/public-marketplace';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'חיפוש נכסים בישראל | Realtorai',
  description:
    'Marketplace נדל"ן עצמאי עם נכסים ממשרדי תיווך, מפה חיה, מועדפים, השוואת נכסים ופנייה ישירה למשרד.',
};

export default function MarketplacePage() {
  return <PublicMarketplace mode="page" />;
}
