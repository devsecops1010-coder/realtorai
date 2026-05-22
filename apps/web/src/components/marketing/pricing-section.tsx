import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingTier {
  name: string;
  description: string;
  setupIls: string;
  monthlyIls: string;
  highlight?: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
}

const TIERS: PricingTier[] = [
  {
    name: 'Starter',
    description: 'משרד בודד, מעט לידים בחודש',
    setupIls: '7,500',
    monthlyIls: '4,900',
    features: [
      'סוכן מענה ללידים',
      'WhatsApp Business (Twilio Sandbox)',
      '500 הודעות בחודש',
      'CRM בסיסי',
      'תמיכה בצ׳אט',
    ],
    cta: 'התחל ניסיון',
    ctaHref: '/register',
  },
  {
    name: 'Pro',
    description: 'הנפוץ ביותר — לרוב משרדי התיווך',
    setupIls: '12,500',
    monthlyIls: '6,900',
    highlight: true,
    features: [
      'שני הסוכנים (מענה + גיוס דירות)',
      'WhatsApp עם המספר העסקי שלך',
      '2,000 הודעות בחודש',
      'CRM מלא + נכסים',
      'דוחות יומיים אוטומטיים',
      'תמיכה בעדיפות + הקמה אישית',
      'התאמת תסריטים',
    ],
    cta: 'התחל ניסיון',
    ctaHref: '/register',
  },
  {
    name: 'Network',
    description: 'רשתות תיווך עם 3+ סניפים',
    setupIls: '15,000+',
    monthlyIls: '8,900+',
    features: [
      'הכל ב-Pro',
      'משתמשים ללא הגבלה',
      '5,000 הודעות בחודש',
      'דוחות לפי סניף ולמטה',
      'API לאינטגרציות',
      'SLA חתום',
      'הקמה ב-30 יום + אונבורדינג של כל הצוות',
    ],
    cta: 'דבר איתנו',
    ctaHref: '#contact',
  },
];

export function PricingSection({ heading = 'מחירים', subheading = 'כל מה שנדרש כדי להתחיל. בלי הפתעות.' }: { heading?: string; subheading?: string }) {
  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{heading}</h2>
          <p className="text-lg text-muted-foreground">{subheading}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={
                t.highlight
                  ? 'relative rounded-lg border-2 border-primary bg-card p-6 shadow-lg'
                  : 'rounded-lg border bg-card p-6'
              }
            >
              {t.highlight && (
                <Badge className="absolute -top-3 right-1/2 translate-x-1/2 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  הכי נפוץ
                </Badge>
              )}
              <h3 className="text-2xl font-bold mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t.description}</p>

              <div className="mb-4">
                <div className="text-sm text-muted-foreground">דמי הקמה חד-פעמיים</div>
                <div className="text-xl font-semibold" dir="ltr">
                  ₪{t.setupIls}
                </div>
              </div>
              <div className="mb-6">
                <div className="text-sm text-muted-foreground">תשלום חודשי</div>
                <div className="text-4xl font-bold" dir="ltr">
                  ₪{t.monthlyIls}
                  <span className="text-base font-normal text-muted-foreground"> / חודש</span>
                </div>
              </div>

              <Button asChild className="w-full mb-6" variant={t.highlight ? 'default' : 'outline'}>
                <Link href={t.ctaHref}>{t.cta}</Link>
              </Button>

              <ul className="space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          חריגה מההיקף החודשי: ₪0.30/הודעה, ₪1.80/דקת שיחה. ללא התחייבות, הפסקה בכל עת.
        </p>
      </div>
    </section>
  );
}
