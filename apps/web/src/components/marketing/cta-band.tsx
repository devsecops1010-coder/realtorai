import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Gauge, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CTA_POINTS = [
  'משרד אחד',
  'שני סוכנים ראשונים',
  'דשבורד תוצאות',
  'החלטה לפי מספרים',
];

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground">
      <div className="absolute inset-0 bg-dots opacity-15" />
      <div className="container relative mx-auto grid gap-8 px-4 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold opacity-80">הדרך הנכונה להתחיל</p>
          <h2 className="max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
            לפני שמוסיפים תקציב פרסום, סוגרים את הדליפות בלידים הקיימים.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed opacity-90">
            מתחילים בפיילוט מדיד, בודקים כמה לידים קיבלו מענה, כמה פגישות נקבעו וכמה בעלי נכסים נכנסו למעקב.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="text-base">
              <Link href="#contact">
                קבע שיחת התאמה
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-base text-white hover:bg-white/20">
              <Link href="/pricing">ראה חבילות</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur">
          <div className="grid grid-cols-3 gap-3">
            <MiniMetric icon={MessageCircle} value="24/7" label="מענה" />
            <MiniMetric icon={Users} value="2+" label="סוכנים" />
            <MiniMetric icon={Gauge} value="ROI" label="מדידה" />
          </div>
          <div className="mt-5 space-y-2">
            {CTA_POINTS.map((point) => (
              <div key={point} className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-md border border-white/20 bg-white/10 p-3 text-center">
      <Icon className="mx-auto mb-2 h-4 w-4" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}
