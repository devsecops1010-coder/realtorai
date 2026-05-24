import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Calculator,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroLivePropertyMap } from './hero-live-property-map';

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

          <HeroLivePropertyMap />
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
            href="/#marketplace"
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
          href="/#marketplace"
          className="flex min-h-12 items-center gap-3 rounded-md border bg-background px-4 text-right text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Search className="h-5 w-5 text-primary" />
          חפש עיר, שכונה, רחוב או נכס
        </Link>
        <Button asChild variant="outline" className="h-12">
          <Link href="/#marketplace">
            <SlidersHorizontal className="h-4 w-4" />
            פילטרים
          </Link>
        </Button>
        <Button asChild variant="gradient" className="btn-shine h-12">
          <Link href="/#marketplace">
            חפש עכשיו
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {CITY_CHIPS.map((city) => (
          <Link key={city} href="/#marketplace" className="rounded-full border bg-background px-3 py-1 text-muted-foreground hover:text-foreground">
            {city}
          </Link>
        ))}
      </div>
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
