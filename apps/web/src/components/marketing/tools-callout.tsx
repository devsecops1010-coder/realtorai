import Link from 'next/link';
import { Banknote, Calculator, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * "כלים" call-out for the landing page. Two cards (mortgage + tax) with
 * a link to the full /tools index. Drives organic traffic — buyers
 * searching for "מחשבון משכנתא" / "מחשבון מס רכישה" land here, use the
 * tool, and discover the rest of the product.
 *
 * Placed between FAQ and the contact form so visitors who didn't convert
 * on the pricing CTA still leave with something useful (and bookmarked).
 */
export function ToolsCallout() {
  return (
    <section className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-8">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary mb-2">
          כלים חינמיים
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          המחשבונים שכל קונה דירה צריך
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          ללא הרשמה, ללא תשלום. תמהיל משכנתא מלא וחישוב מס רכישה מדויק — באותה רמה
          שיועצים מקצועיים משתמשים בה.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ToolLink
          href="/tools/mortgage-calculator"
          icon={Banknote}
          title="מחשבון משכנתא"
          subtitle="תמהיל פריים · קל״צ · ק״צ + לוח סילוקין"
        />
        <ToolLink
          href="/tools/tax-calculator"
          icon={Calculator}
          title="מחשבון מס רכישה"
          subtitle="דירה יחידה / משקיע · מעודכן 2026"
        />
      </div>

      <div className="text-center mt-6">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/tools">
            לכל הכלים <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function ToolLink({
  href, icon: Icon, title, subtitle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border bg-card p-5 hover:border-primary/40 hover:shadow-lift hover:-translate-y-px transition-all"
    >
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/15 grid place-items-center group-hover:from-primary/25 group-hover:to-fuchsia-500/25 transition-colors shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
    </Link>
  );
}
