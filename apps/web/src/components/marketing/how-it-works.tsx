import { MessageSquare, Bot, Bell, BarChart3 } from 'lucide-react';

const STEPS = [
  {
    n: 1,
    icon: MessageSquare,
    title: 'מחברים את ה-WhatsApp העסקי',
    body: 'תוך פחות מ-30 דקות. אנחנו תומכים ב-Twilio, Meta Cloud, ו-360dialog. ה-WhatsApp הקיים שלך — לא צריך מספר חדש.',
  },
  {
    n: 2,
    icon: Bot,
    title: 'שני סוכני AI מתחילים לעבוד',
    body: 'סוכן מענה ללידים נכנסים, וסוכן גיוס דירות עבור בעלי נכסים. שניהם כותבים בעברית טבעית, מתאימים לטון של המשרד שלך.',
  },
  {
    n: 3,
    icon: Bell,
    title: 'אתה מקבל רק לידים חמים',
    body: 'הסוכן מסנן, מקבל פרטים (תקציב, אזור, חדרים), ומעביר אליך התראה רק כשיש כוונה אמיתית. שאר ההובלות מטופלות אוטומטית.',
  },
  {
    n: 4,
    icon: BarChart3,
    title: 'הCRM מתעדכן לבד',
    body: 'כל שיחה, כל פרט, כל סטטוס — נכנס אוטומטית למערכת. אתה עובד מתוך דשבורד אחד, רואה מי חם, מה הסטטוס, ומה חייב מעקב.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">איך זה עובד</h2>
          <p className="text-lg text-muted-foreground">
            4 שלבים, התקנה תוך יום, החזר ROI תוך שבועיים.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="relative rounded-lg border bg-card p-6">
                <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {s.n}
                </div>
                <Icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
