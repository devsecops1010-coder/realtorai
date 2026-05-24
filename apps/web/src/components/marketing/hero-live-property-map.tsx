'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bell, Heart, Home, Loader2, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { MapPoint } from '@/components/marketplace/live-map';
import { api, ApiError } from '@/lib/api';

const LiveMap = dynamic(() => import('@/components/marketplace/live-map').then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[370px] place-items-center bg-muted/30 text-sm text-muted-foreground">
      טוען מפה חיה...
    </div>
  ),
});

interface PublicProperty {
  id: string;
  dealType: 'sale' | 'rent';
  city: string | null;
  area: string | null;
  street: string | null;
  rooms: number | null;
  floor: number | null;
  price: number | null;
  coverImageUrl: string | null;
  galleryUrls: string[] | null;
  latitude: number | null;
  longitude: number | null;
}

interface PublicSearchResponse {
  items: PublicProperty[];
  total: number;
  take: number;
  skip: number;
}

export function HeroLivePropertyMap() {
  const [items, setItems] = useState<PublicProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);

      try {
        const response = await api<PublicSearchResponse>('/properties/public/search?take=24', {
          skipAuth: true,
        });

        if (cancelled) return;

        setItems(response.items);
        setTotal(response.total);
        setSelectedId(response.items[0]?.id ?? null);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;

        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'לא הצלחנו לטעון את המפה');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const points = useMemo<MapPoint[]>(
    () =>
      items
        .filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
        .map((item) => ({
          id: item.id,
          lat: item.latitude as number,
          lng: item.longitude as number,
          price: item.price,
          dealType: item.dealType,
          title: [item.city, item.area, item.street].filter(Boolean).join(', ') || 'נכס',
          subtitle: [
            item.rooms ? `${item.rooms} חדרים` : null,
            item.floor !== null ? `קומה ${item.floor}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          imageUrl: item.coverImageUrl || (Array.isArray(item.galleryUrls) ? item.galleryUrls[0] : null),
        })),
    [items],
  );

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-lift">
      <div className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          מפת נכסים חיה
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" dir="ltr">
          <span
            className={
              status === 'ready' ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-amber-500'
            }
          />
          live properties
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_220px]">
        <div className="relative min-h-[370px] overflow-hidden bg-muted/30">
          <div className="absolute right-3 top-3 z-[1000] rounded-md border bg-background/95 px-3 py-2 text-sm shadow-soft backdrop-blur">
            {status === 'loading' ? 'טוען נכסים מהמפה...' : `${points.length} נכסים מוצגים`}
          </div>

          {status === 'loading' ? (
            <div className="grid h-full min-h-[370px] place-items-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען מפה חיה...
              </span>
            </div>
          ) : status === 'error' ? (
            <div className="grid h-full min-h-[370px] place-items-center p-6 text-center text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">המפה לא נטענה כרגע</p>
                <p className="mt-1">{error}</p>
                <Link href="/marketplace" className="mt-3 inline-block text-primary hover:underline">
                  עבור לחיפוש נכסים
                </Link>
              </div>
            </div>
          ) : (
            <LiveMap points={points} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          )}
        </div>

        <div className="space-y-3 border-t bg-muted/25 p-4 lg:border-r lg:border-t-0">
          <PanelMetric icon={Home} label="נכסים פעילים" value={total ? `${total}` : `${items.length}`} />
          <PanelMetric icon={Heart} label="מועדפים" value="שמור והשווה" />
          <PanelMetric icon={Bell} label="התראות" value="חיפוש שמור" />
          <PanelMetric icon={ShieldCheck} label="מקור" value="משרדי תיווך" />

          {selected ? (
            <Link
              href={`/marketplace/${selected.id}`}
              className="block rounded-md border bg-background p-3 text-sm shadow-soft transition-colors hover:border-primary"
            >
              <div className="text-xs text-muted-foreground">נכס נבחר</div>
              <div className="mt-1 font-semibold">{[selected.city, selected.area].filter(Boolean).join(', ') || 'נכס'}</div>
              <div className="mt-1 text-primary">כל הפרטים ←</div>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PanelMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
