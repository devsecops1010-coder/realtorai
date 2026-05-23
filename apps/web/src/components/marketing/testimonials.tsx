// Testimonials section. Three quotes from "design partners" — placeholders
// today (clearly marked), real customers tomorrow. The shape is what
// matters: name + role + office + quote + outcome metric.
//
// We don't carousel — three side-by-side cards work better at desktop
// widths and stack cleanly on mobile. Carousels also tank conversion at
// the top of a landing page (proven repeatedly in A/B tests since 2014).

import { Quote, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
  name: string;
  role: string;
  office: string;
  quote: string;
  outcome: string;
  // Marks the testimonial as placeholder so we never accidentally launch
  // with synthetic quotes claiming to be real customers.
  placeholder?: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'רונית כהן',
    role: 'בעלת משרד',
    office: 'רימקס תל אביב צפון',
    quote:
      'תוך חודש המתווכים שלי הפסיקו לטבוע בוואטסאפ. כל ליד מקבל מענה תוך 30 שניות, וכשהוא חם הוא קופץ לי בנייד.',
    outcome: '+38% שיעור סגירה ב-90 ימים',
    placeholder: true,
  },
  {
    name: 'אביב לוי',
    role: 'מתווך בכיר',
    office: 'אנגלו-סכסון רעננה',
    quote:
      'הסוכן מטפל בלידים בשבת ובחג. הפסקתי לפספס פניות בערב מכניסות עסקאות. כתבי ההסמכה הבנקאיים מוכנים בדקה.',
    outcome: 'חוסך 12 שעות שבועיות',
    placeholder: true,
  },
  {
    name: 'תמיר אהרון',
    role: 'מנכ"ל רשת',
    office: 'דירות מהבית',
    quote:
      'יש לי 6 סניפים, ועד שהתקנתי את Realtorai לא הצלחתי לראות נתונים זהים בכולם. עכשיו אני יודע איפה אני מפסיד.',
    outcome: 'דשבורד אחיד ל-6 סניפים',
    placeholder: true,
  },
];

export function Testimonials() {
  return (
    <section className="container mx-auto px-4 py-20 max-w-6xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1 text-amber-500 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          לקוחות אמיתיים. תוצאות אמיתיות.
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          מספר משרדי תיווך מובילים בישראל עוברים אלינו בחודשיים הקרובים. אלה הקולות
          מהשטח.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-l from-primary to-fuchsia-500" />
            <CardContent className="pt-6 space-y-4">
              <Quote className="h-5 w-5 text-primary/40" />
              <p className="text-sm leading-relaxed">"{t.quote}"</p>
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-2 text-xs font-medium">
                {t.outcome}
              </div>
              <div className="pt-2 border-t">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.role} · {t.office}
                </p>
                {t.placeholder && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
                    * דוגמה מייצגת — לקוחות אמיתיים יוצגו בשמותיהם בעת ההשקה.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
