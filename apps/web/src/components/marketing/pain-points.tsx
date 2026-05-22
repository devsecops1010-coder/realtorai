import { AlertCircle, Hourglass, MessageSquareOff, XCircle } from 'lucide-react';

const PAINS = [
  {
    icon: Hourglass,
    title: 'לידים אבודים בשעות לא-נוחות',
    body: 'מתעניין שולח הודעה ב-22:30. עד שמישהו רואה אותה — הוא כבר אצל המתחרים. לידים שלא נענים תוך שעה — נגמרים אצל אחרים.',
  },
  {
    icon: MessageSquareOff,
    title: 'שעות של הקלדה ידנית ב-CRM',
    body: 'אחרי כל שיחה — מתווכים מקלידים ידנית מי, מה, איפה, תקציב. רוב הזמן זה לא קורה ולידים נופלים בין הכיסאות.',
  },
  {
    icon: XCircle,
    title: 'פולואפים שנשכחים',
    body: '"חזרו אלי עוד שבועיים" — ואז כולם שוכחים. לידים פושרים שצריך לחמם נופלים סטטיסטית בלי תזכורת אוטומטית.',
  },
  {
    icon: AlertCircle,
    title: 'גיוס דירות בידיים — כואב, איטי, יקר',
    body: 'בעלי דירות שלא מתחילים תהליך מכירה כי אף אחד לא ליווה אותם. שיחות גישוש חוזרות שגוזלות שעות בשבוע.',
  },
];

export function PainPoints() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            מכיר/ה את התסכול הזה?
          </h2>
          <p className="text-lg text-muted-foreground">
            רוב משרדי התיווך מאבדים 40-60% מהלידים. לא בגלל איכות — בגלל זמן.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {PAINS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-lg border bg-card p-6">
                <Icon className="h-8 w-8 text-rose-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
