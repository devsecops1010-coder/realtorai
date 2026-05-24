'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Bell, Heart, Home, Loader2, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { MapPoint } from '@/components/marketplace/live-map';
import { api, ApiError } from '@/lib/api';

const HERO_FETCH_LIMIT = 40;
const HERO_PROPERTY_LIMIT = 5;
const HERO_FIT_PADDING: [number, number] = [54, 54];

const LiveMap = dynamic(() => import('@/components/marketplace/live-map').then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[430px] place-items-center bg-muted/30 text-sm text-muted-foreground">
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

function selectHeroProperties(items: PublicProperty[]) {
  const geoItems = items.filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number');
  const picked: PublicProperty[] = geoItems[0] ? [geoItems[0]] : [];

  while (picked.length < HERO_PROPERTY_LIMIT && picked.length < geoItems.length) {
    let next: PublicProperty | null = null;
    let bestDistance = -1;

    for (const item of geoItems) {
      if (picked.some((candidate) => candidate.id === item.id)) continue;
      const nearestPickedDistance = Math.min(...picked.map((candidate) => distanceBetween(item, candidate)));

      if (nearestPickedDistance > bestDistance) {
        bestDistance = nearestPickedDistance;
        next = item;
      }
    }

    if (!next) break;
    picked.push(next);
  }

  if (picked.length >= HERO_PROPERTY_LIMIT) return picked.slice(0, HERO_PROPERTY_LIMIT);

  for (const item of items) {
    if (picked.some((candidate) => candidate.id === item.id)) continue;
    picked.push(item);
    if (picked.length === HERO_PROPERTY_LIMIT) break;
  }

  return picked;
}

function distanceBetween(a: PublicProperty, b: PublicProperty) {
  if (
    typeof a.latitude !== 'number' ||
    typeof a.longitude !== 'number' ||
    typeof b.latitude !== 'number' ||
    typeof b.longitude !== 'number'
  ) {
    return 0;
  }

  const lat = a.latitude - b.latitude;
  const lng = a.longitude - b.longitude;
  return Math.sqrt(lat * lat + lng * lng);
}

function formatPrice(price: number | null, dealType: 'sale' | 'rent') {
  if (!price) return 'מחיר יעודכן';
  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(price);

  return dealType === 'rent' ? `${formatted} / חודש` : formatted;
}

export function HeroLivePropertyMap() {
  const [items, setItems] = useState<PublicProperty[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);

      try {
        const response = await api<PublicSearchResponse>(`/properties/public/search?take=${HERO_FETCH_LIMIT}`, {
          skipAuth: true,
        });

        if (cancelled) return;

        const heroItems = selectHeroProperties(response.items);
        setItems(heroItems);
        setSelectedId(heroItems[0]?.id ?? null);
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
  const displayedCount = points.length || items.length;

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

      <div>
        <div className="relative min-h-[430px] overflow-hidden bg-muted/30">
          <div className="absolute right-3 top-3 z-[700] rounded-md border bg-background/95 px-3 py-2 text-sm shadow-soft backdrop-blur">
            {status === 'loading' ? 'טוען נכסים מהמפה...' : `${points.length} נכסים מוצגים`}
          </div>

          {status === 'loading' ? (
            <div className="grid h-full min-h-[430px] place-items-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען מפה חיה...
              </span>
            </div>
          ) : status === 'error' ? (
            <div className="grid h-full min-h-[430px] place-items-center p-6 text-center text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">המפה לא נטענה כרגע</p>
                <p className="mt-1">{error}</p>
                <Link href="/marketplace" className="mt-3 inline-block text-primary hover:underline">
                  עבור לחיפוש נכסים
                </Link>
              </div>
            </div>
          ) : (
            <>
              <LiveMap
                points={points}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                collisionPrecision={1}
                collisionSpread={0.045}
                compactMarkers
                fitMaxZoom={11}
                fitPadding={HERO_FIT_PADDING}
                minHeight={430}
                scrollWheelZoom={false}
                tileStyle="light"
                zoomControl={false}
              />

              {selected ? (
                <Link
                  href={`/marketplace/${selected.id}`}
                  className="absolute bottom-3 right-3 z-[700] w-[min(280px,calc(100%-24px))] rounded-lg border bg-background/95 p-3 text-sm shadow-lift backdrop-blur transition-colors hover:border-primary"
                >
                  <div className="text-xs text-muted-foreground">נכס נבחר</div>
                  <div className="mt-1 font-semibold">{[selected.city, selected.area].filter(Boolean).join(', ') || 'נכס'}</div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-primary">
                    <span className="font-bold">{formatPrice(selected.price, selected.dealType)}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      כל הפרטים
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ) : null}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t bg-muted/25 p-3 sm:grid-cols-4">
          <PanelMetric icon={Home} label="נכסים מוצגים" value={`${displayedCount}`} />
          <PanelMetric icon={Heart} label="מועדפים" value="שמור והשווה" />
          <PanelMetric icon={Bell} label="התראות" value="חיפוש שמור" />
          <PanelMetric icon={ShieldCheck} label="מקור" value="משרדי תיווך" />
        </div>
      </div>
    </div>
  );
}

function PanelMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/90 p-3">
      <Icon className="mb-1.5 h-4 w-4 text-primary" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
