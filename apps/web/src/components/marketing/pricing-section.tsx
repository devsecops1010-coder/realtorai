import Link from 'next/link';
import { Check, MessageCircle, PhoneCall, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingTier {
  name: string;
  description: string;
  setupIls: string;
  monthlyIls: string;
  scope: string;
  highlight?: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
}

const TIERS: PricingTier[] = [
  {
    name: 'Starter',
    description: 'משרד קטן שרוצה להציל לידים נכנסים',
    setupIls: '7,500',
    monthlyIls: '4,900',
    scope: 'סוכן מענה + CRM בסיסי',
    features: [
      'סוכן מענה ללידים',
      'חיבור WhatsApp Business',
      '500 הודעות בחודש',
      'CRM בסיסי',
      'דוח שבועי לבעל המשרד',
    ],
    cta: 'קבע דמו',
    ctaHref: '#contact',
  },
  {
    name: 'Pro',
    description: 'החבילה המרכזית למשרד פעיל',
    setupIls: '12,500',
    monthlyIls: '6,900',
    scope: 'מענה + גיוס דירות + משכנתאות',
    highlight: true,
    features: [
      'שני הסוכנים המרכזיים',
      'WhatsApp עם המספר העסקי שלך',
      '2,000 הודעות בחודש',
      'CRM מלא + נכסים',
      'מודול משכנתאות והפניה ליועץ',
      'דוחות יומיים אוטומטיים',
      'תמיכה בעדיפות + הקמה אישית',
      'התאמת תסריטים',
    ],
    cta: 'דבר איתנו',
    ctaHref: '#contact',
  },
  {
    name: 'Network',
    description: 'רשתות, סניפים וצוותי מכירות',
    setupIls: '15,000+',
    monthlyIls: '8,900+',
    scope: 'ריבוי משרדים והרשאות הנהלה',
    features: [
      'הכל ב-Pro',
      'משתמשים ללא הגבלה',
      '5,000 הודעות בחודש',
      'דוחות לפי סניף ולמטה',
      'API לאינטגרציות',
      'הרשאות מתקדמות ו-audit',
      'SLA חתום',
      'הקמה ב-30 יום + אונבורדינג צוותים',
    ],
    cta: 'דבר איתנו',
    ctaHref: '#contact',
  },
];

export function PricingSection({
  heading = 'מחירים',
  subheading = 'דמי הקמה, תשלום חודשי ושימוש שקוף לפי הודעות או דקות.',
}: {
  heading?: string;
  subheading?: string;
}) {
  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">מודל עסקי</p>
          <h2 className="mb-4 text-3xl font-bold md:text-5xl">{heading}</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{subheading}</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.highlight
                  ? 'relative overflow-hidden rounded-lg border-2 border-primary bg-card p-6 shadow-lift'
                  : 'relative overflow-hidden rounded-lg border bg-card p-6 shadow-soft'
              }
            >
              {tier.highlight ? (
                <Badge className="absolute left-5 top-5 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  הכי נפוץ
                </Badge>
              ) : null}

              <div className="mb-6">
                <h3 className="text-2xl font-bold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                <div className="mt-4 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {tier.scope}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PriceBox label="הקמה" value={tier.setupIls} />
                <PriceBox label="חודשי" value={tier.monthlyIls} suffix="/חודש" />
              </div>

              <Button asChild className="mt-6 w-full" variant={tier.highlight ? 'default' : 'outline'}>
                <Link href={tier.ctaHref}>{tier.cta}</Link>
              </Button>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm leading-6">
                    <Check className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-lg border bg-muted/35 p-4 text-sm text-muted-foreground md:grid-cols-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            חריגה מההיקף החודשי: ₪0.30 להודעה
          </div>
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" />
            שיחות קוליות: ₪1.80 לדקת שיחה, לפי שימוש
          </div>
        </div>
      </div>
    </section>
  );
}

function PriceBox({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold" dir="ltr">
        ₪{value}
      </div>
      {suffix ? <div className="text-xs text-muted-foreground">{suffix}</div> : null}
    </div>
  );
}
