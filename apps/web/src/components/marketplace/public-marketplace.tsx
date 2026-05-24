'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { MapPoint } from './live-map';
import { CityAutocomplete } from '@/components/geo/city-autocomplete';

// Leaflet touches `window` on import — it must not run on the server.
// Dynamic-import with ssr:false isolates the map bundle (~40 kB) to the
// client and only when the user actually switches to map view.
const LiveMap = dynamic(() => import('./live-map').then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-muted/30 text-sm text-muted-foreground">
      טוען מפה...
    </div>
  ),
});
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  Calculator,
  CheckCircle2,
  Heart,
  Home,
  Layers,
  List,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Phone,
  Printer,
  Scale,
  Search,
  Send,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type DealType = 'sale' | 'rent' | '';
type MarketView = 'list' | 'map' | 'insights';

interface PublicProperty {
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
  // Geo — server-resolved (real value falls back to city centroid).
  // Null when even the city is unknown — those properties are skipped
  // on the map but still listed.
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
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

interface PublicSearchResponse {
  items: PublicProperty[];
  total: number;
  take: number;
  skip: number;
}

const dealLabels: Record<'sale' | 'rent', string> = {
  sale: 'מכירה',
  rent: 'השכרה',
};

const featureInspiration = [
  { icon: SlidersHorizontal, title: 'פילטרים עמוקים', body: 'מחיר, חדרים, אזור, סוג עסקה ובהמשך חניה, מעלית, ממ"ד ושטח.' },
  { icon: MapPinned, title: 'חיפוש מפה', body: 'מעבר מהיר בין רשימה למפה, עם הכנה לציור אזור וחיפוש סביב נקודות עניין.' },
  { icon: BarChart3, title: 'תובנות שכונה', body: 'ממוצעים, אזורים פופולריים, טווחי מחירים וחיבור עתידי לעסקאות עבר.' },
  { icon: Bell, title: 'התראות חיפוש', body: 'שמירת חיפושים כדי לעדכן לקוחות כשנכסים מתאימים עולים.' },
  { icon: Heart, title: 'מועדפים והשוואה', body: 'סימון נכסים, השוואת חלופות והעברה מסודרת למשרד המטפל.' },
  { icon: Calculator, title: 'משכנתא בתוך הנכס', body: 'חישוב ראשוני וחיבור ליועץ משכנתאות מתוך תהליך ההתעניינות.' },
];

export function PublicMarketplace({ mode = 'home' }: { mode?: 'home' | 'page' }) {
  const isPage = mode === 'page';
  // Read filters from the URL on first render so the hero search
  // (and shareable links) can deep-link to a pre-filtered marketplace.
  // The URL is the *source* of truth at load; after that the form
  // controls own the state — we don't write back to the URL on every
  // keystroke (would spam history + break the back button).
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    q: searchParams.get('q') ?? '',
    dealType: (searchParams.get('dealType') ?? '') as DealType,
    city: searchParams.get('city') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    minRooms: searchParams.get('minRooms') ?? '',
  }));
  const [items, setItems] = useState<PublicProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({ fullName: '', phone: '', email: '', message: '' });
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [view, setView] = useState<MarketView>('list');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [searchSaved, setSearchSaved] = useState(false);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );
  const stats = useMemo(() => buildStats(items), [items]);
  const comparedItems = useMemo(
    () => items.filter((item) => compareIds.includes(item.id)),
    [compareIds, items],
  );

  useEffect(() => {
    setFavoriteIds(readStoredList('realtorai_market_favorites'));
    setCompareIds(readStoredList('realtorai_market_compare'));
    setSavedSearches(readStoredList('realtorai_market_searches'));
    void load();
    // Initial marketplace load only. Further loads are explicit through the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setSearchSaved(false);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      params.set('take', isPage ? '30' : '8');
      const res = await api<PublicSearchResponse>(`/properties/public/search?${params.toString()}`, {
        skipAuth: true,
      });
      setItems(res.items);
      setTotal(res.total);
      setSelectedId((current) => {
        if (current && res.items.some((item) => item.id === current)) return current;
        return res.items[0]?.id ?? null;
      });
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || 'לא הצלחנו לטעון נכסים כרגע');
    } finally {
      setLoading(false);
    }
  }

  async function submitLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setLeadStatus('sending');
    setLeadError(null);
    try {
      await api(`/properties/public/${selected.id}/leads`, {
        method: 'POST',
        skipAuth: true,
        body: leadForm,
      });
      setLeadStatus('sent');
      setLeadForm({ fullName: '', phone: '', email: '', message: '' });
    } catch (err) {
      const e = err as ApiError;
      setLeadStatus('error');
      setLeadError(e.status === 400 ? 'צריך להשאיר טלפון או אימייל' : e.message);
    }
  }

  function saveCurrentSearch() {
    const label = formatSearchLabel(filters);
    const next = [label, ...savedSearches.filter((item) => item !== label)].slice(0, 5);
    setSavedSearches(next);
    storeList('realtorai_market_searches', next);
    setSearchSaved(true);
  }

  function toggleFavorite(id: string) {
    const next = toggleListValue(favoriteIds, id);
    setFavoriteIds(next);
    storeList('realtorai_market_favorites', next);
  }

  function toggleCompare(id: string) {
    const next = compareIds.includes(id)
      ? compareIds.filter((item) => item !== id)
      : [...compareIds, id].slice(-3);
    setCompareIds(next);
    storeList('realtorai_market_compare', next);
  }

  const content = (
    <section
      id="marketplace"
      className={isPage ? 'bg-background pb-12' : 'relative border-y bg-muted/25 py-20'}
      dir="rtl"
    >
      <div className="container mx-auto px-4">
        <div className="grid gap-6 py-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              Marketplace נדל"ן עצמאי
            </Badge>
            {isPage ? (
              <h1 className="max-w-3xl text-3xl font-bold md:text-4xl">
                חיפוש נכסים בישראל עם מפה, תובנות ולידים במקום אחד
              </h1>
            ) : (
              <h2 className="max-w-4xl text-4xl font-bold md:text-5xl">
                נכסים, משרדי תיווך, מפה, תובנות ולידים במקום אחד
              </h2>
            )}
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              מאגר נכסים עצמאי ממשרדי תיווך, עם חיפוש מתקדם, מצב מפה, שמירת חיפושים,
              מועדפים, השוואה ופנייה שנכנסת ישירות ל-CRM.
            </p>
            {!isPage && (
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Pill>מקור נכסים חוקי ממשרדים</Pill>
                <Pill>תובנות אזור לפני פנייה</Pill>
                <Pill>משכנתא, מסמכים וחתימות בהמשך העסקה</Pill>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="נכסים" value={String(total)} />
            <Metric label="מועדפים" value={String(favoriteIds.length)} />
            <Metric label="להשוואה" value={String(compareIds.length)} />
          </div>
        </div>

        <FeatureRail />

        <form onSubmit={load} className="mt-5 grid gap-3 rounded-lg border bg-card p-4 shadow-soft md:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="market-q">חיפוש חופשי</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="market-q"
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                placeholder="עיר, שכונה, רחוב או תיאור"
                className="pr-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="market-deal-type">סוג עסקה</Label>
            <select
              id="market-deal-type"
              value={filters.dealType}
              onChange={(e) => setFilters((prev) => ({ ...prev, dealType: e.target.value as DealType }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">הכל</option>
              <option value="sale">מכירה</option>
              <option value="rent">השכרה</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="market-city">עיר</Label>
            {/* CityAutocomplete is backed by /geo/settlements — same data
                source the property forms will eventually use. Picking a
                city from the dropdown sets `filters.city` to the Hebrew
                name so the existing search query (which already filters
                on `city contains q`) works unchanged. */}
            <CityAutocomplete
              value={filters.city}
              onChange={(v) => setFilters((prev) => ({ ...prev, city: v }))}
              placeholder="לדוגמה הרצליה"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="market-max-price">מחיר עד</Label>
            <Input
              id="market-max-price"
              type="number"
              inputMode="numeric"
              value={filters.maxPrice}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
              placeholder="4,000,000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="market-min-rooms">חדרים מ-</Label>
            <Input
              id="market-min-rooms"
              type="number"
              step="0.5"
              inputMode="decimal"
              value={filters.minRooms}
              onChange={(e) => setFilters((prev) => ({ ...prev, minRooms: e.target.value }))}
              placeholder="3"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                <SlidersHorizontal className="h-4 w-4" />
                {loading ? 'מחפש...' : 'סנן נכסים'}
              </Button>
              <Button type="button" variant="outline" onClick={saveCurrentSearch}>
                <Bell className="h-4 w-4" />
                {searchSaved ? 'החיפוש נשמר' : 'שמור חיפוש'}
              </Button>
            </div>
            <ViewSwitch value={view} onChange={setView} />
          </div>
        </form>

        {savedSearches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {savedSearches.map((search) => (
              <span key={search} className="rounded-full border bg-background px-3 py-1">
                {search}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {!error && loading && (
              <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">טוען נכסים...</div>
            )}
            {!error && !loading && items.length === 0 && (
              <div className="rounded-lg border bg-card p-8 text-center">
                <Home className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="text-xl font-semibold">אין עדיין נכסים פעילים בתוצאות האלו</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  המאגר הציבורי מתמלא מתוך משרדי התיווך. נסה לשנות פילטרים או השאר פרטים.
                </p>
              </div>
            )}
            {!loading && view === 'list' && items.map((property) => (
              <PropertyRow
                key={property.id}
                property={property}
                selected={selected?.id === property.id}
                favorite={favoriteIds.includes(property.id)}
                compared={compareIds.includes(property.id)}
                onSelect={() => {
                  setSelectedId(property.id);
                  setLeadStatus('idle');
                  setLeadError(null);
                }}
                onFavorite={() => toggleFavorite(property.id)}
                onCompare={() => toggleCompare(property.id)}
              />
            ))}
            {!loading && view === 'map' && (
              <MapView
                items={items}
                selectedId={selected?.id ?? null}
                onSelect={(id) => {
                  setSelectedId(id);
                  setLeadStatus('idle');
                  setLeadError(null);
                }}
              />
            )}
            {!loading && view === 'insights' && (
              <InsightsView
                items={items}
                stats={stats}
                selected={selected}
                comparedItems={comparedItems}
              />
            )}
            {!isPage && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/marketplace">פתח עמוד חיפוש מלא</Link>
              </Button>
            )}
          </div>

          <aside className="h-fit rounded-lg border bg-card p-5 shadow-soft lg:sticky lg:top-20">
            {selected ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Badge>{dealLabels[selected.dealType]}</Badge>
                  <h3 className="text-xl font-semibold">
                    {selected.city || 'נכס'}{selected.area ? `, ${selected.area}` : ''}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.office.name} מטפל בנכס הזה. השאר פרטים ונעביר את הפנייה למשרד.
                  </p>
                </div>

                <PropertyGallery property={selected} />

                <div className="grid grid-cols-3 gap-2">
                  <MiniAction
                    active={favoriteIds.includes(selected.id)}
                    label="שמור"
                    icon={Heart}
                    onClick={() => toggleFavorite(selected.id)}
                  />
                  <MiniAction
                    active={compareIds.includes(selected.id)}
                    label="השווה"
                    icon={Scale}
                    onClick={() => toggleCompare(selected.id)}
                  />
                  <MiniAction label="הדפס" icon={Printer} onClick={() => window.print()} />
                </div>

                <PropertySnapshot property={selected} stats={stats} />

                <form onSubmit={submitLead} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="market-full-name">שם מלא</Label>
                    <Input
                      id="market-full-name"
                      value={leadForm.fullName}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market-phone">טלפון</Label>
                    <Input
                      id="market-phone"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      dir="ltr"
                      placeholder="0500000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market-email">אימייל</Label>
                    <Input
                      id="market-email"
                      type="email"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                      dir="ltr"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market-message">מה חשוב לך?</Label>
                    <Textarea
                      id="market-message"
                      value={leadForm.message}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="מועד כניסה, מימון, אזור, שאלות על הנכס..."
                      rows={4}
                    />
                  </div>
                  {leadStatus === 'sent' && (
                    <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                      הפנייה נשלחה. המשרד יקבל אותה ב-CRM.
                    </p>
                  )}
                  {leadStatus === 'error' && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {leadError}
                    </p>
                  )}
                  <Button type="submit" disabled={leadStatus === 'sending'} className="w-full">
                    <Send className="h-4 w-4" />
                    {leadStatus === 'sending' ? 'שולח...' : 'שלח פנייה'}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <Home className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">בחר נכס כדי להשאיר פנייה</h3>
                <p className="text-sm text-muted-foreground">
                  בהמשך הסוכן החכם יציע נכסים לפי שיחה טבעית ומיקום על מפה.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );

  if (!isPage) return content;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/95">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            RealtorAI
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/">אתר הבית</Link>
            </Button>
            <Button asChild>
              <Link href="/login">כניסת משרדים</Link>
            </Button>
          </div>
        </div>
      </header>
      {content}
    </main>
  );
}

function FeatureRail() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {featureInspiration.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="rounded-lg border bg-card p-4 shadow-soft">
            <Icon className="mb-3 h-5 w-5 text-primary" />
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function ViewSwitch({ value, onChange }: { value: MarketView; onChange: (value: MarketView) => void }) {
  const options: { value: MarketView; label: string; icon: typeof List }[] = [
    { value: 'list', label: 'רשימה', icon: List },
    { value: 'map', label: 'מפה', icon: MapIcon },
    { value: 'insights', label: 'תובנות', icon: BarChart3 },
  ];

  return (
    <div className="grid grid-cols-3 rounded-md border bg-background p-1">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? 'inline-flex h-9 items-center justify-center gap-1 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground'
                : 'inline-flex h-9 items-center justify-center gap-1 rounded-sm px-3 text-sm font-medium text-muted-foreground hover:text-foreground'
            }
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-4">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PropertyRow({
  property,
  selected,
  favorite,
  compared,
  onSelect,
  onFavorite,
  onCompare,
}: {
  property: PublicProperty;
  selected: boolean;
  favorite: boolean;
  compared: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onCompare: () => void;
}) {
  const address = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'כתובת תעודכן בהמשך';
  const image = getCoverImage(property);

  // We want the whole content area (image + title + features + price) to
  // navigate to the detail page, but the small action icons (favorite,
  // compare, "select-into-panel") must remain in-place clicks. The simplest
  // pattern that works inside accessibility constraints: wrap each
  // navigable chunk in a `Link`, and let the actions sit outside as
  // siblings with `e.stopPropagation()` not needed because they're not
  // descendants of the Link.
  const href = `/marketplace/${property.id}`;
  return (
    <Card className={selected ? 'overflow-hidden border-primary shadow-soft' : 'overflow-hidden hover:shadow-lift hover:border-primary/30 transition'}>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[210px_1fr_auto] md:items-center">
        <Link
          href={href}
          className="group relative aspect-[4/3] overflow-hidden rounded-md bg-muted text-right"
          aria-label={`פתח דף נכס: ${address}`}
        >
          {image ? (
            <img
              src={image}
              alt={address}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))] text-sm text-muted-foreground">
              תמונת נכס תעלה בקרוב
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-1 text-xs font-medium shadow-soft">
            {dealLabels[property.dealType]}
          </span>
        </Link>

        <Link href={href} className="block space-y-3 group">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={property.dealType === 'sale' ? 'default' : 'secondary'}>
              {dealLabels[property.dealType]}
            </Badge>
            {property.condition && <Badge variant="outline">{conditionLabel(property.condition)}</Badge>}
            {isFresh(property.updatedAt) && <Badge variant="success">חדש</Badge>}
          </div>
          <div>
            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{address}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              משרד: {getOfficeDisplayName(property)}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Home className="h-4 w-4" />
              {property.rooms ? `${property.rooms} חדרים` : 'חדרים יעודכנו'}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.floor !== null ? `קומה ${property.floor}` : 'קומה תעודכן'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {property.price && property.rooms ? `${formatPrice(Math.round(property.price / property.rooms))} לחדר` : 'מדד מחיר יעודכן'}
            </span>
          </div>
        </Link>

        <div className="space-y-3 md:min-w-48 md:text-left">
          <Link href={href} className="block text-2xl font-bold hover:text-primary transition-colors">
            {property.price ? formatPrice(property.price) : 'מחיר יעודכן'}
          </Link>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={favorite ? 'default' : 'outline'} size="icon" onClick={onFavorite} aria-label="שמור נכס">
              <Heart className="h-4 w-4" />
            </Button>
            <Button type="button" variant={compared ? 'default' : 'outline'} size="icon" onClick={onCompare} aria-label="השווה נכס">
              <Scale className="h-4 w-4" />
            </Button>
            <Button type="button" onClick={onSelect} variant={selected ? 'default' : 'outline'} size="icon" aria-label="בחר נכס לתצוגה מקדימה">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild variant="gradient" size="sm" className="w-full gap-1.5">
            <Link href={href}>
              כל הפרטים
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MapView({
  items,
  selectedId,
  onSelect,
}: {
  items: PublicProperty[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Translate the marketplace items into the minimal shape the LiveMap
  // needs. Drops anything without resolved geo (e.g. property in an
  // unknown city) — those rows still appear in the right-side list.
  const mapPoints: MapPoint[] = items
    .filter((it) => typeof it.latitude === 'number' && typeof it.longitude === 'number')
    .map((it) => ({
      id: it.id,
      lat: it.latitude as number,
      lng: it.longitude as number,
      price: it.price,
      dealType: it.dealType,
      title: [it.city, it.area, it.street].filter(Boolean).join(', ') || 'נכס',
      subtitle: [
        it.rooms ? `${it.rooms} חדרים` : null,
        it.floor !== null ? `קומה ${it.floor}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      imageUrl: it.coverImageUrl,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="relative min-h-[420px] overflow-hidden rounded-lg border">
        {/* Floating "N נכסים באזור" tag — same visual the fake map had. */}
        <div className="absolute bottom-3 right-3 z-[1000] rounded-md border bg-background/95 px-3 py-2 text-sm shadow-soft backdrop-blur">
          {items.length} נכסים באזור
        </div>
        <LiveMap points={mapPoints} selectedId={selectedId} onSelect={onSelect} />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={
              item.id === selectedId
                ? 'w-full rounded-md border border-primary bg-primary/10 p-3 text-right'
                : 'w-full rounded-md border bg-card p-3 text-right hover:border-primary/40'
            }
          >
            <div className="font-semibold">{[item.city, item.area].filter(Boolean).join(', ') || 'נכס'}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {item.rooms ? `${item.rooms} חדרים` : 'חדרים יעודכנו'} · {item.price ? formatPrice(item.price) : 'מחיר יעודכן'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightsView({
  items,
  stats,
  selected,
  comparedItems,
}: {
  items: PublicProperty[];
  stats: MarketStats;
  selected: PublicProperty | null;
  comparedItems: PublicProperty[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-xl font-semibold">תמונת שוק מהתוצאות</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Insight label="מכירה" value={String(stats.saleCount)} />
          <Insight label="השכרה" value={String(stats.rentCount)} />
          <Insight label="מחיר ממוצע" value={stats.averagePrice ? formatPrice(stats.averagePrice) : 'אין מספיק מידע'} />
          <Insight label="חדרים ממוצע" value={stats.averageRooms ? stats.averageRooms.toFixed(1) : 'אין מספיק מידע'} />
        </div>
        <div className="mt-5 space-y-2">
          <h4 className="font-semibold">אזורים בולטים</h4>
          {stats.topAreas.length === 0 && <p className="text-sm text-muted-foreground">אין עדיין מספיק אזורים.</p>}
          {stats.topAreas.map((area) => (
            <div key={area.name} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
              <span>{area.name}</span>
              <span className="font-semibold">{area.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-xl font-semibold">פרופיל אזור לנכס שנבחר</h3>
        {selected ? (
          <div className="mt-4 space-y-3">
            <Insight label="מיקום" value={[selected.city, selected.area].filter(Boolean).join(', ') || 'יעודכן'} />
            <Insight label="משרד מטפל" value={selected.office.name} />
            <Insight label="סוג עסקה" value={dealLabels[selected.dealType]} />
            <div className="rounded-md border bg-background p-3 text-sm leading-7 text-muted-foreground">
              {selected.city || selected.area
                ? 'השלב הבא הוא לחבר נתוני עסקאות, בתי ספר, תחבורה ומדדי ביקוש לפי כתובת.'
                : 'ברגע שתוזן כתובת מלאה, המערכת תוכל להציג סביבת נכס מדויקת יותר.'}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">בחר נכס כדי לראות תובנות.</p>
        )}
      </div>

      <MortgageMiniCalc property={selected} />

      <ComparePanel items={items} comparedItems={comparedItems} />
    </div>
  );
}

function MortgageMiniCalc({ property }: { property: PublicProperty | null }) {
  const price = property?.price ?? 2_000_000;
  const [equity, setEquity] = useState(Math.round(price * 0.3));
  const [years, setYears] = useState(25);
  const [interest, setInterest] = useState(4.8);

  useEffect(() => {
    setEquity(Math.round(price * 0.3));
  }, [price]);

  const principal = Math.max(price - equity, 0);
  const monthlyInterest = interest / 100 / 12;
  const months = years * 12;
  const monthly =
    monthlyInterest === 0
      ? principal / months
      : (principal * monthlyInterest * Math.pow(1 + monthlyInterest, months)) /
        (Math.pow(1 + monthlyInterest, months) - 1);

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        <Calculator className="h-5 w-5 text-primary" />
        מחשבון משכנתא ראשוני
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FieldNumber label="הון עצמי" value={equity} onChange={setEquity} />
        <FieldNumber label="שנים" value={years} onChange={setYears} />
        <FieldNumber label="ריבית %" value={interest} onChange={setInterest} step="0.1" />
      </div>
      <div className="mt-4 rounded-md border bg-background p-4">
        <div className="text-sm text-muted-foreground">החזר חודשי משוער</div>
        <div className="mt-1 text-2xl font-bold">{Number.isFinite(monthly) ? formatPrice(Math.round(monthly)) : '—'}</div>
      </div>
    </div>
  );
}

function ComparePanel({ items, comparedItems }: { items: PublicProperty[]; comparedItems: PublicProperty[] }) {
  const shown = comparedItems.length > 0 ? comparedItems : items.slice(0, 3);
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        <Scale className="h-5 w-5 text-primary" />
        השוואת נכסים
      </h3>
      <div className="mt-4 space-y-2">
        {shown.length === 0 && <p className="text-sm text-muted-foreground">אין נכסים להשוואה.</p>}
        {shown.map((item) => (
          <div key={item.id} className="grid grid-cols-[64px_1fr_auto] gap-3 rounded-md border bg-background p-3 text-sm">
            <PropertyThumb property={item} />
            <div>
              <div className="font-semibold">{[item.city, item.area].filter(Boolean).join(', ') || 'נכס'}</div>
              <div className="text-muted-foreground">{dealLabels[item.dealType]} · {item.rooms ?? '—'} חדרים</div>
            </div>
            <div className="font-bold">{item.price ? formatPrice(item.price) : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyGallery({ property }: { property: PublicProperty }) {
  const images = getGalleryImages(property).slice(0, 4);
  const address = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'נכס';

  if (images.length === 0) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-md border bg-muted text-sm text-muted-foreground">
        תמונות הנכס יוצגו כאן
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="aspect-[16/10] overflow-hidden rounded-md border bg-muted">
        <img src={images[0]} alt={address} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {images.slice(1).map((image, index) => (
            <div key={`${image}-${index}`} className="aspect-[4/3] overflow-hidden rounded-md border bg-muted">
              <img src={image} alt={`${address} ${index + 2}`} loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyThumb({ property }: { property: PublicProperty }) {
  const image = getCoverImage(property);
  const address = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'נכס';

  return image ? (
    <img src={image} alt={address} loading="lazy" className="h-16 w-16 rounded-md object-cover" />
  ) : (
    <div className="grid h-16 w-16 place-items-center rounded-md bg-muted text-xs text-muted-foreground">נכס</div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        dir="ltr"
      />
    </div>
  );
}

function PropertySnapshot({ property, stats }: { property: PublicProperty; stats: MarketStats }) {
  const relative =
    property.price && stats.averagePrice
      ? Math.round(((property.price - stats.averagePrice) / stats.averagePrice) * 100)
      : null;

  return (
    <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">מחיר</span>
        <span className="font-semibold">{property.price ? formatPrice(property.price) : '—'}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">חדרים</span>
        <span className="font-semibold">{property.rooms ?? '—'}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">מול ממוצע תוצאות</span>
        <span className="font-semibold">{relative === null ? '—' : `${relative > 0 ? '+' : ''}${relative}%`}</span>
      </div>
    </div>
  );
}

function MiniAction({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Heart;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-md border border-primary bg-primary/10 px-2 py-2 text-sm font-medium text-primary'
          : 'rounded-md border bg-background px-2 py-2 text-sm font-medium hover:border-primary/40'
      }
    >
      <Icon className="mx-auto mb-1 h-4 w-4" />
      {label}
    </button>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

interface MarketStats {
  saleCount: number;
  rentCount: number;
  averagePrice: number | null;
  averageRooms: number | null;
  topAreas: { name: string; count: number }[];
}

function buildStats(items: PublicProperty[]): MarketStats {
  const prices = items.map((item) => item.price).filter((price): price is number => typeof price === 'number');
  const rooms = items.map((item) => item.rooms).filter((room): room is number => typeof room === 'number');
  const areas = new Map<string, number>();
  items.forEach((item) => {
    const key = item.area || item.city || 'אזור לא ידוע';
    areas.set(key, (areas.get(key) ?? 0) + 1);
  });

  return {
    saleCount: items.filter((item) => item.dealType === 'sale').length,
    rentCount: items.filter((item) => item.dealType === 'rent').length,
    averagePrice: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
    averageRooms: rooms.length ? rooms.reduce((sum, room) => sum + room, 0) / rooms.length : null,
    topAreas: Array.from(areas.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

function shortPrice(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function conditionLabel(condition: string) {
  const labels: Record<string, string> = {
    new: 'חדש',
    excellent: 'מצוין',
    good: 'טוב',
    needs_renovation: 'דורש שיפוץ',
    for_demolition: 'לפינוי/הריסה',
  };
  return labels[condition] ?? condition;
}

function getOfficeDisplayName(property: PublicProperty) {
  if (property.notes?.startsWith('DEMO_SEED_50')) return 'משרד תיווך מאומת';
  return property.office.name;
}

function getCoverImage(property: PublicProperty) {
  return property.coverImageUrl || getGalleryImages(property)[0] || null;
}

function getGalleryImages(property: PublicProperty) {
  const images = [
    property.coverImageUrl,
    ...(Array.isArray(property.galleryUrls) ? property.galleryUrls : []),
  ].filter((image): image is string => typeof image === 'string' && image.length > 0);
  return Array.from(new Set(images));
}

function isFresh(updatedAt: string) {
  const updated = new Date(updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated < 1000 * 60 * 60 * 24 * 14;
}

function formatSearchLabel(filters: { q: string; dealType: DealType; city: string; maxPrice: string; minRooms: string }) {
  const parts = [
    filters.dealType ? dealLabels[filters.dealType] : 'כל העסקאות',
    filters.city || filters.q || 'כל הארץ',
    filters.maxPrice ? `עד ${formatPrice(Number(filters.maxPrice))}` : null,
    filters.minRooms ? `${filters.minRooms}+ חדרים` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

function readStoredList(key: string) {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function storeList(key: string, value: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function toggleListValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
