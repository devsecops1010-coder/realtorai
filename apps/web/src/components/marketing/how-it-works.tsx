import { BarChart3, Bell, Bot, MessageSquare, Percent, PlugZap } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    icon: PlugZap,
    title: 'מחברים מקורות',
    body: 'WhatsApp, טפסים, העלאות ידניות ורשימות קיימות נכנסים למשרד אחד מסודר.',
    output: 'מקור + סטטוס',
  },
  {
    n: '02',
    icon: Bot,
    title: 'הסוכן מסנן',
    body: 'הוא שואל שאלות קצרות, שומר תשובות ומבין אם צריך אדם.',
    output: 'כרטיס ליד',
  },
  {
    n: '03',
    icon: Percent,
    title: 'בודקים בשלות',
    body: 'תקציב, אזור, חדרים, לוח זמנים ואישור משכנתא נכנסים לתמונה.',
    output: 'ציון חום',
  },
  {
    n: '04',
    icon: Bell,
    title: 'מעבירים לאדם',
    body: 'מתווך מקבל סיכום קצר ומשימה רק כשיש סיבה אמיתית להיכנס.',
    output: 'משימה',
  },
  {
    n: '05',
    icon: BarChart3,
    title: 'מודדים תוצאה',
    body: 'בעל המשרד רואה לידים שטופלו, פגישות, נכסים, שימוש ועלות.',
    output: 'ROI',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">הפתרון</p>
          <h2 className="mb-5 text-4xl font-bold md:text-5xl">איך זה עובד במשרד אמיתי</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            תהליך קצר שמתחיל במשרד אחד, מייצר מספרים, ואז משוכפל למשרדים נוספים.
          </p>
        </div>

        <div className="mx-auto max-w-7xl rounded-lg border bg-background p-4 shadow-soft md:p-6">
          <div className="grid gap-4 lg:grid-cols-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="relative rounded-lg border bg-card p-5">
                  {index < STEPS.length - 1 ? (
                    <div className="absolute left-[-1rem] top-9 hidden h-px w-8 bg-border lg:block" />
                  ) : null}
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-3xl font-bold text-gradient">{step.n}</span>
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-semibold">{step.title}</h3>
                  <p className="min-h-[5.25rem] text-sm leading-7 text-muted-foreground">{step.body}</p>
                  <div className="mt-4 rounded-md border bg-muted/45 px-3 py-2 text-sm font-medium">
                    {step.output}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            כל שלב מתועד, נמדד ומופיע באזור האישי לפי התפקיד של המשתמש.
          </div>
        </div>
      </div>
    </section>
  );
}
