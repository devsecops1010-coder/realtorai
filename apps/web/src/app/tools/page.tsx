import Link from 'next/link';
import type { Metadata } from 'next';
import { Banknote, Calculator, ArrowLeft } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'כלים | Realtorai',
  description:
    'מחשבונים חינמיים לקונים, מוכרים ומתווכים — מחשבון משכנתא ומחשבון מס רכישה ישראליים.',
};

/**
 * Index page for the public utility tools. Lives at /tools and acts as the
 * landing point linked from the marketing nav. Listing two tools today
 * (mortgage + purchase tax); leave room to add a third (e.g. capital-gains
 * tax, rent-vs-buy) without restructuring.
 */
export default function ToolsPage() {
  return (
    <>
      <MarketingNav />
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">כלים חינמיים</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            מחשבונים מקצועיים לקונים, מוכרים ומתווכים. ללא הרשמה, ללא תשלום.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-5">
          <ToolCard
            href="/tools/mortgage-calculator"
            icon={Banknote}
            title="מחשבון משכנתא"
            blurb="תמהיל מלא של עד 5 מסלולים, חוקי בנק ישראל, לוח סילוקין וגרף החזרים — בדיוק כמו אצל יועצי המשכנתאות."
            highlight="פריים · קל״צ · ק״צ · מ״צ"
          />
          <ToolCard
            href="/tools/tax-calculator"
            icon={Calculator}
            title="מחשבון מס רכישה"
            blurb="חישוב מס רכישה לפי מדרגות 2026 — דירה יחידה ומשקיע. כולל פירוט מדרגה אחרי מדרגה."
            highlight="מעודכן 2026"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

function ToolCard({
  href, icon: Icon, title, blurb, highlight,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  highlight: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full hover:shadow-lift hover:border-primary/40 hover:-translate-y-px transition-all">
        <CardContent className="pt-6 space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/15 group-hover:from-primary/25 group-hover:to-fuchsia-500/25 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-xs text-primary mt-0.5">{highlight}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{blurb}</p>
          <div className="flex items-center gap-1 text-sm text-primary font-medium pt-1">
            פתח את המחשבון <ArrowLeft className="h-3.5 w-3.5 group-hover:translate-x-[-2px] transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
