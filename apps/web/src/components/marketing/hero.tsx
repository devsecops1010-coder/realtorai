import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calculator,
  CheckCircle2,
  Heart,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SEARCH_TABS = ['קנייה', 'השכרה', 'דירות חדשות', 'מסחרי'];
const CITY_CHIPS = ['הרצליה', 'תל אביב', 'ירושלים', 'חיפה', 'רמת גן'];

const HERO_FEATURES = [
  { icon: Search, title: 'חיפוש נכסים', body: 'רשימה, מפה, פילטרים ושמירת חיפושים.' },
  { icon: BarChart3, title: 'תובנות אזור', body: 'מחירים, אזורים בולטים והשוואת חלופות.' },
  { icon: Bot, title: 'סוכני AI', body: 'מענה ללידים, גיוס בעלי דירות ו-CRM.' },
  { icon: Calculator, title: 'משכנתא וחתימות', body: 'חישוב ראשוני והמשך תהליך מול המשרד.' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-spotlight">
      {/* Decorative blurred blobs — float gently so the hero feels alive
          without distracting from the content. Pointer-events disabled so
          clicks pass through to the search panel below. */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[hsl(var(--grad-from)/0.18)] blur-3xl animate-float pointer-events-none" />
      <div
        className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[hsl(var(--grad-to)/0.16)] blur-3xl animate-float pointer-events-none"
        style={{ animationDelay: '-3s' }}
      />

      <div className="container relative mx-auto px-4 py-12 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="space-y-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur px-4 py-1.5 text-sm font-medium shadow-soft">
              <Sparkles className="h-4 w-4 text-primary" />
              אלטרנטיבה חכמה ליד2, מדלן ו-OnMap
            </div>

            <div className="space-y-5">
              <h1 className="text-display max-w-4xl text-5xl font-bold md:text-7xl">
                כל הנדל"ן במקום אחד:
                <br />
                <span className="text-gradient-animated">נכסים, מפה, תובנות ו-AI.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                RealtorAI מחברת חיפוש נכסים ציבורי עם מערכת עבודה למשרדי תיווך:
                לידים, CRM, גיוס בעלי דירות, משכנתאות, מסמכים וחתימות דיגיטליות.
              </p>
            </div>

            <HeroSearch />

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {['מאגר עצמאי ממשרדים', 'מועדפים והשוואה', 'פניות נכנסות ל-CRM'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <HeroMapPanel />
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {HERO_FEATURES.map((feature) => (
            <HeroFeature key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroSearch() {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-lift">
      <div className="mb-4 flex flex-wrap gap-2">
        {SEARCH_TABS.map((tab, index) => (
          <Link
            key={tab}
            href="#marketplace"
            className={
              index === 0
                ? 'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground'
                : 'rounded-md border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground'
            }
          >
            {tab}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <Link
          href="#marketplace"
          className="flex min-h-12 items-center gap-3 rounded-md border bg-background px-4 text-right text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Search className="h-5 w-5 text-primary" />
          חפש עיר, שכונה, רחוב או נכס
        </Link>
        <Button asChild variant="outline" className="h-12">
          <Link href="#marketplace">
            <SlidersHorizontal className="h-4 w-4" />
            פילטרים
          </Link>
        </Button>
        <Button asChild variant="gradient" className="btn-shine h-12">
          <Link href="#marketplace">
            חפש עכשיו
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {CITY_CHIPS.map((city) => (
          <Link key={city} href="#marketplace" className="rounded-full border bg-background px-3 py-1 text-muted-foreground hover:text-foreground">
            {city}
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeroMapPanel() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-lift">
      <div className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <Building2 className="h-5 w-5 text-primary" />
          מפת נדל"ן חכמה
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" dir="ltr">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          live marketplace
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_220px]">
        <div className="relative min-h-[370px] overflow-hidden bg-[linear-gradient(135deg,hsl(var(--muted))_0%,hsl(var(--background))_100%)]">
          <div className="absolute inset-0 bg-dots opacity-70" />
          <div className="absolute right-8 top-8 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-soft">
            ציור אזור וחיפוש מפה בהמשך
          </div>
          <MapPrice top="24%" right="24%" label="8.5K" active />
          <MapPrice top="42%" right="62%" label="4.2M" />
          <MapPrice top="66%" right="38%" label="3.1M" />
          <MapPrice top="55%" right="78%" label="12K" />
          <MapPrice top="76%" right="18%" label="2.7M" />
        </div>

        <div className="space-y-3 border-t bg-muted/25 p-4 lg:border-r lg:border-t-0">
          <PanelMetric icon={Home} label="נכסים פעילים" value="2" />
          <PanelMetric icon={Heart} label="מועדפים" value="שמור והשווה" />
          <PanelMetric icon={Bell} label="התראות" value="חיפוש שמור" />
          <PanelMetric icon={ShieldCheck} label="מקור" value="משרדי תיווך" />
        </div>
      </div>
    </div>
  );
}

function MapPrice({ top, right, label, active }: { top: string; right: string; label: string; active?: boolean }) {
  return (
    <Link
      href="#marketplace"
      className={
        active
          ? 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-glow'
          : 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background px-3 py-2 text-sm font-bold shadow-soft hover:border-primary'
      }
      style={{ top, right }}
    >
      {label}
    </Link>
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

function HeroFeature({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="group rounded-xl border bg-card p-4 shadow-soft hover:shadow-lift hover:border-primary/30 transition-all duration-200">
      {/* Icon sits inside a subtle gradient chip so the cards have a more
          premium feel than a flat 16px lucide icon on white. */}
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-fuchsia-500/15 group-hover:from-primary/25 group-hover:to-fuchsia-500/25 transition-colors">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
