'use client';

/**
 * Full public property detail. Renders below the marketing nav at
 * /marketplace/[id]. Three-column desktop layout:
 *   - Main column: gallery + headline + features + description
 *   - Side column: price card + office contact + lead form + mortgage CTA
 *
 * Stacks to a single column on mobile. Gallery is a simple
 * thumbnail-strip + main-image swap (no carousel library — adds ~30kB
 * we don't need; the click-to-swap UX is fine for the typical 3-10
 * image set on a residential listing).
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Home, MapPin, Layers, Calendar, Phone, MessageCircle, Heart, Scale, Share2,
  Building2, ShieldCheck, Sparkles, Calculator, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

const dealLabels = { sale: 'מכירה', rent: 'השכרה' } as const;

const conditionLabels: Record<string, string> = {
  new: 'חדש',
  excellent: 'מצוין',
  good: 'טוב',
  needs_renovation: 'דורש שיפוץ',
  for_demolition: 'להריסה',
};

function formatPrice(price: number | null, dealType: 'sale' | 'rent') {
  if (price === null) return 'המחיר יתעדכן';
  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(price);
  return dealType === 'rent' ? `${formatted} / חודש` : formatted;
}

function getImages(property: PublicProperty): string[] {
  const cover = property.coverImageUrl;
  const gallery = property.galleryUrls ?? [];
  const merged = [cover, ...gallery].filter(Boolean) as string[];
  // Dedup while preserving order — covers the case where the same URL
  // appears both as cover and in the gallery.
  return Array.from(new Set(merged));
}

function isFresh(updatedAt: string): boolean {
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days < 7;
}

export function PublicPropertyDetail({ property }: { property: PublicProperty }) {
  const images = getImages(property);
  const [activeImage, setActiveImage] = useState(0);
  const address = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'כתובת תעודכן';
  const pricePerRoom = property.price && property.rooms
    ? Math.round(property.price / property.rooms)
    : null;
  const fresh = isFresh(property.updatedAt);

  return (
    <article className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Gallery images={images} activeIndex={activeImage} onChange={setActiveImage} dealLabel={dealLabels[property.dealType]} />

          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={property.dealType === 'sale' ? 'default' : 'secondary'} className="text-sm">
                {dealLabels[property.dealType]}
              </Badge>
              {property.condition && (
                <Badge variant="outline">{conditionLabels[property.condition] ?? property.condition}</Badge>
              )}
              {fresh && <Badge variant="success">חדש</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{address}</h1>
            <p className="text-sm text-muted-foreground">
              משרד מטפל:{' '}
              <Link
                href={`/marketplace?city=${encodeURIComponent(property.office.city ?? '')}`}
                className="text-primary hover:underline font-medium"
              >
                {property.office.name}
              </Link>
            </p>
          </header>

          <FeatureGrid property={property} pricePerRoom={pricePerRoom} />

          {property.notes && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">תיאור הנכס</h2>
              <p className="text-sm leading-7 text-foreground/85 whitespace-pre-wrap">{property.notes}</p>
            </section>
          )}

          <MortgagePreview price={property.price} dealType={property.dealType} />
        </div>

        {/* Side column ─────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-20 h-fit">
          <Card className="overflow-hidden border-primary/30">
            <div className="bg-gradient-to-br from-primary/10 via-transparent to-fuchsia-500/10 p-5">
              <p className="text-xs text-muted-foreground mb-1">
                {property.dealType === 'rent' ? 'מחיר שכר חודשי' : 'מחיר מבוקש'}
              </p>
              <p className="text-3xl md:text-4xl font-bold text-gradient">
                {formatPrice(property.price, property.dealType)}
              </p>
              {pricePerRoom !== null && property.dealType === 'sale' && (
                <p className="text-xs text-muted-foreground mt-1">
                  ~{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(pricePerRoom)} לחדר
                </p>
              )}
            </div>
            <CardContent className="space-y-3 pt-5">
              <OfficeContact office={property.office} />
              <div className="grid grid-cols-2 gap-2">
                <ShareButton property={property} />
                <SaveButton propertyId={property.id} />
              </div>
            </CardContent>
          </Card>

          <LeadForm propertyId={property.id} dealType={property.dealType} />
        </aside>
      </div>

      <TrustStrip />
    </article>
  );
}

function Gallery({
  images, activeIndex, onChange, dealLabel,
}: {
  images: string[];
  activeIndex: number;
  onChange: (i: number) => void;
  dealLabel: string;
}) {
  const main = images[activeIndex];
  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted">
        {main ? (
          // Plain <img> — Next/Image needs remote-hosts config we don't have
          // for the user-uploaded URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={main} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))] text-muted-foreground">
            תמונת נכס תעלה בקרוב
          </div>
        )}
        <span className="absolute right-4 top-4 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold shadow-soft">
          {dealLabel}
        </span>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onChange(i)}
              className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 ${
                i === activeIndex ? 'border-primary' : 'border-transparent hover:border-primary/40'
              } transition-colors`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureGrid({
  property, pricePerRoom,
}: { property: PublicProperty; pricePerRoom: number | null }) {
  const cells: { icon: typeof Home; label: string; value: string }[] = [
    {
      icon: Home,
      label: 'חדרים',
      value: property.rooms ? `${property.rooms}` : 'יעודכן',
    },
    {
      icon: Layers,
      label: 'קומה',
      value: property.floor !== null ? `${property.floor}` : 'יעודכן',
    },
    {
      icon: MapPin,
      label: 'אזור',
      value: property.area ?? property.city ?? 'יעודכן',
    },
    {
      icon: Calendar,
      label: 'עודכן',
      value: new Date(property.updatedAt).toLocaleDateString('he-IL'),
    },
  ];
  if (pricePerRoom !== null && property.dealType === 'sale') {
    cells.push({
      icon: Building2,
      label: 'מחיר לחדר',
      value: new Intl.NumberFormat('he-IL', {
        style: 'currency', currency: 'ILS', maximumFractionDigits: 0,
      }).format(pricePerRoom),
    });
  }

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cells.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-xl border bg-card p-3">
            <Icon className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-semibold text-sm truncate" title={c.value}>{c.value}</p>
          </div>
        );
      })}
    </section>
  );
}

function OfficeContact({ office }: { office: PublicProperty['office'] }) {
  const wa = office.whatsappNumber?.replace(/\D/g, '');
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm">
        <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{office.name}</p>
          {office.city && <p className="text-xs text-muted-foreground">{office.city}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {office.phone && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`tel:${office.phone}`} dir="ltr">
              <Phone className="h-3.5 w-3.5" /> חיוג
            </a>
          </Button>
        )}
        {wa && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function ShareButton({ property }: { property: PublicProperty }) {
  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const address = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'נכס';
    if (navigator.share) {
      try {
        await navigator.share({ title: `${address} — Realtorai`, url });
      } catch {
        // user dismissed — silent
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success('הקישור הועתק');
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={share} className="gap-1.5">
      <Share2 className="h-3.5 w-3.5" /> שיתוף
    </Button>
  );
}

function SaveButton({ propertyId }: { propertyId: string }) {
  // localStorage-backed favorites — same key as the marketplace search page.
  const [saved, setSaved] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = JSON.parse(localStorage.getItem('realtorai_market_favorites') ?? '[]');
      return Array.isArray(stored) && stored.includes(propertyId);
    } catch {
      return false;
    }
  });
  function toggle() {
    try {
      const raw = localStorage.getItem('realtorai_market_favorites') ?? '[]';
      const list: string[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const next = list.includes(propertyId)
        ? list.filter((x) => x !== propertyId)
        : [...list, propertyId];
      localStorage.setItem('realtorai_market_favorites', JSON.stringify(next));
      setSaved(next.includes(propertyId));
      toast.success(next.includes(propertyId) ? 'נשמר במועדפים' : 'הוסר מהמועדפים');
    } catch {
      // ignore
    }
  }
  return (
    <Button variant={saved ? 'default' : 'outline'} size="sm" onClick={toggle} className="gap-1.5">
      <Heart className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
      {saved ? 'שמור' : 'שמור'}
    </Button>
  );
}

function LeadForm({ propertyId, dealType }: { propertyId: string; dealType: 'sale' | 'rent' }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || (!form.phone.trim() && !form.email.trim())) {
      setError('שם + טלפון או אימייל הם חובה');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch(`/api/properties/public/${propertyId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          message: form.message || (dealType === 'rent' ? 'מתעניין/ת בשכירות הנכס' : 'מתעניין/ת ברכישת הנכס'),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'שליחת הפנייה נכשלה');
      }
      setStatus('sent');
      toast.success('הפנייה נשלחה למשרד המטפל');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'שליחת הפנייה נכשלה');
    }
  }

  if (status === 'sent') {
    return (
      <Card className="border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20">
        <CardContent className="pt-6 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h3 className="font-bold">הפנייה נשלחה</h3>
          <p className="text-sm text-muted-foreground">
            המשרד יחזור אליך בהקדם. בינתיים — בחנו עוד נכסים דומים בחיפוש.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> פנה למשרד
          </h3>
          <p className="text-xs text-muted-foreground">
            ניצור קשר תוך זמן קצר. הפרטים נשלחים ישירות למשרד המטפל.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="ln" className="text-xs">שם מלא</Label>
            <Input
              id="ln"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="lp" className="text-xs">טלפון</Label>
              <Input
                id="lp" type="tel" dir="ltr"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="le" className="text-xs">אימייל</Label>
              <Input
                id="le" type="email" dir="ltr"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lm" className="text-xs">הודעה (אופציונלי)</Label>
            <Textarea
              id="lm" rows={3}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {error}
            </p>
          )}
          <Button type="submit" variant="gradient" className="w-full gap-2" disabled={status === 'sending'}>
            {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            שלח פנייה
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MortgagePreview({ price, dealType }: { price: number | null; dealType: 'sale' | 'rent' }) {
  if (dealType !== 'sale' || !price) return null;
  // Quick estimate: 75% LTV, 25 years, 4.5% blended rate → standard PMT.
  const loan = Math.round(price * 0.75);
  const r = 0.045 / 12;
  const n = 25 * 12;
  const monthly = loan > 0 ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;

  return (
    <section className="rounded-xl border bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center shrink-0">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-bold">תשלום משכנתא משוער</h3>
          <p className="text-sm text-muted-foreground">
            בהנחה של 25% הון עצמי, 25 שנה ב-4.5%:
          </p>
          <p className="text-2xl font-bold text-gradient">
            ~{new Intl.NumberFormat('he-IL', {
              style: 'currency', currency: 'ILS', maximumFractionDigits: 0,
            }).format(Math.round(monthly))}
            <span className="text-sm font-normal text-muted-foreground"> / חודש</span>
          </p>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/tools/mortgage-calculator?price=${price}`}>
              <Calculator className="h-3.5 w-3.5" /> חשב תמהיל מלא
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, label: 'מקור: משרדי תיווך רשומים' },
    { icon: Sparkles, label: 'עדכון יומי מהמשרד' },
    { icon: Building2, label: 'ללא דמי תיווך פלטפורמה' },
  ];
  return (
    <section className="border-t pt-6">
      <ul className="grid sm:grid-cols-3 gap-3 text-sm">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4 text-primary" />
              {it.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
