import { MessageSquare, Bot, Bell, BarChart3 } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    icon: MessageSquare,
    title: 'מחברים את WhatsApp',
    body: 'תוך 15 דקות. תמיכה ב-Twilio, Meta Cloud ו-360dialog. המספר הקיים שלך — בלי לעבור.',
  },
  {
    n: '02',
    icon: Bot,
    title: 'שני סוכני AI עולים',
    body: 'מענה ללידים נכנסים + גיוס דירות מבעלי נכסים. עברית טבעית, טון של המשרד שלך.',
  },
  {
    n: '03',
    icon: Bell,
    title: 'התראות רק על חמים',
    body: 'הסוכן מסנן, מקבל פרטים (תקציב, אזור, חדרים), ומעביר אליך רק לידים אמיתיים.',
  },
  {
    n: '04',
    icon: BarChart3,
    title: 'הCRM מתעדכן לבד',
    body: 'כל שיחה, כל פרט, כל סטטוס — נכנס אוטומטית. אתה רק עוקב מהדשבורד.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-muted/30 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">הפתרון</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            איך זה עובד
          </h2>
          <p className="text-lg text-muted-foreground">
            4 שלבים, התקנה תוך יום, החזר השקעה תוך שבועיים.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.n}
                className="group relative rounded-2xl border bg-card p-6 shadow-soft hover:shadow-lift transition-all"
              >
                <div className="text-5xl font-bold text-gradient mb-2 opacity-80">{s.n}</div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-fuchsia-500/10 mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
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
