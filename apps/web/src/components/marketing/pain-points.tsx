import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  MessageSquareOff,
} from 'lucide-react';

const PAINS = [
  {
    icon: Clock3,
    title: 'תגובה איטית',
    body: 'ליד שמקבל תשובה אחרי שעה כבר מדבר עם משרד אחר.',
  },
  {
    icon: MessageSquareOff,
    title: 'מידע מפוזר',
    body: 'תקציב, אזור, חדרים ופולו-אפ נשארים בתוך WhatsApp ולא מגיעים ל-CRM.',
  },
  {
    icon: DatabaseZap,
    title: 'אין תור עבודה',
    body: 'הצוות לא יודע מה הכי דחוף, מי חם ומי צריך שיחה אנושית עכשיו.',
  },
  {
    icon: AlertCircle,
    title: 'גיוס נכסים בלי שיטה',
    body: 'בעלי דירות מקבלים פניות לא עקביות, בלי תיעוד ובלי פולו-אפ מסודר.',
  },
];

const OUTCOMES = [
  'כל ליד מקבל מענה וסינון ראשוני',
  'כל שיחה נשמרת עם סטטוס ומשימה',
  'בעל המשרד רואה לידים, נכסים ועלות',
  'המתווך נכנס רק כשהלקוח מוכן',
];

export function PainPoints() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">הבעיה</p>
          <h2 className="mb-5 text-4xl font-bold md:text-5xl">
            רוב המשרדים לא מפסידים בגלל מחסור בלידים.
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            הם מפסידים בגלל זמן תגובה, חוסר תיעוד, פולו-אפים שנשכחים והעברה מאוחרת מדי למתווך.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {PAINS.map((pain) => {
              const Icon = pain.icon;
              return (
                <div key={pain.title} className="rounded-lg border bg-card p-5 shadow-soft">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border bg-destructive/10 text-destructive">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-semibold">{pain.title}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{pain.body}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border bg-[linear-gradient(135deg,hsl(var(--primary)/0.10),hsl(var(--accent)/0.55))] p-6 shadow-soft">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-background">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">אחרי Realtorai</h3>
                <p className="text-sm text-muted-foreground">המשרד מקבל תהליך, לא עוד עוד כלי.</p>
              </div>
            </div>

            <div className="space-y-3">
              {OUTCOMES.map((outcome) => (
                <div key={outcome} className="flex items-center justify-between gap-3 rounded-md border bg-background/85 px-4 py-3">
                  <span className="font-medium">{outcome}</span>
                  <ArrowLeft className="h-4 w-4 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
