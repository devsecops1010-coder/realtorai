import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';
import { PublicPropertyDetail } from '@/components/marketplace/public-property-detail';

const INTERNAL_API_URL = (process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');

interface PublicPropertyResponse {
  id: string;
  dealType: 'sale' | 'rent';
  city: string | null;
  area: string | null;
  street: string | null;
  rooms: number | null;
  floor: number | null;
  price: number | null;
  condition: string | null;
  coverImageUrl: string | null;
  galleryUrls: string[] | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  office: {
    id: string;
    name: string;
    city: string | null;
    phone: string | null;
    whatsappNumber: string | null;
  };
}

async function fetchProperty(id: string): Promise<PublicPropertyResponse | null> {
  // Server-side fetch via the internal URL so we don't go through the
  // Next rewrite (faster, fewer hops). Cache disabled so the page reflects
  // edits immediately; ISR is a future optimisation.
  try {
    const res = await fetch(`${INTERNAL_API_URL}/properties/public/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicPropertyResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchProperty(id);
  if (!property) return { title: 'נכס לא נמצא | Realtorai' };
  const address = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'נכס';
  const dealHe = property.dealType === 'sale' ? 'למכירה' : 'להשכרה';
  return {
    title: `${address} — ${dealHe} | Realtorai`,
    description: property.notes?.slice(0, 160) ?? `נכס ${dealHe} במשרד ${property.office.name}.`,
    openGraph: {
      title: `${address} — ${dealHe}`,
      description: property.notes?.slice(0, 200) ?? '',
      images: property.coverImageUrl ? [property.coverImageUrl] : undefined,
    },
  };
}

/**
 * Public property detail page. Server-rendered shell + client interactive
 * detail component. SEO-friendly: server fetch populates the metadata and
 * the initial HTML, so search engines + WhatsApp/Facebook link previews
 * show the right title, image and description.
 */
export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await fetchProperty(id);
  if (!property) notFound();

  return (
    <>
      <MarketingNav />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/marketplace" className="hover:text-foreground hover:underline">
            ← חזרה לחיפוש נכסים
          </Link>
        </nav>
        <PublicPropertyDetail property={property} />
      </main>
      <Footer />
    </>
  );
}
