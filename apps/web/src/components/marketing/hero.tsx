import Link from 'next/link';
import { ArrowLeft, Clock, MessageCircle, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-mesh-strong">
      {/* Decorative grid pattern */}
      <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" />

      <div className="container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-20 relative">
        <div className="mx-auto max-w-4xl text-center animate-fade-up">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-background/80 backdrop-blur text-sm font-medium mb-8 shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            פלטפורמת AI לתיווך — בטא פתוחה
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tighter mb-6">
            לא להחמיץ
            <br />
            עוד אף ליד.
            <br />
            <span className="text-gradient">פעם.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            מערכת חכמה שמטפלת בלידים נכנסים ב-WhatsApp תוך 60 שניות,
            מגייסת בעלי דירות, ומעבירה אליך רק לידים חמים — 24/7.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Button asChild size="lg" className="text-base h-12 px-6 btn-shine shadow-glow">
              <Link href="/register">
                התחל ניסיון חינם
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base h-12 px-6">
              <Link href="#contact">קבע דמו של 15 דק׳</Link>
            </Button>
          </div>

          {/* Trust line */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ללא כרטיס אשראי
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              30 יום ניסיון מלא
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              עברית טבעית RTL
            </span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mt-20">
          <Stat icon={Clock} value="< 60" suffix="שניות" label="זמן תגובה לליד" />
          <Stat icon={MessageCircle} value="80" suffix="%+" label="לידים מטופלים אוטומטית" />
          <Stat icon={TrendingUp} value="3x" suffix="" label="יותר פגישות חמות בחודש" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  suffix,
  label,
}: {
  icon: any;
  value: string;
  suffix: string;
  label: string;
}) {
  return (
    <div className="group relative rounded-2xl border bg-card/60 backdrop-blur p-6 text-center shadow-soft transition-all hover:shadow-lift hover:-translate-y-0.5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-fuchsia-500/10 mb-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="text-4xl font-bold tracking-tight">
        {value}
        <span className="text-2xl text-muted-foreground">{suffix}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
