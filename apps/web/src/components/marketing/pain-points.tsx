import { AlertCircle, Hourglass, MessageSquareOff, XCircle } from 'lucide-react';

const PAINS = [
  {
    icon: Hourglass,
    title: 'לידים אבודים בשעות לא-נוחות',
    body: 'מתעניין שולח הודעה ב-22:30. עד שמישהו רואה אותה — הוא כבר אצל המתחרים. לידים שלא נענים תוך שעה — נגמרים אצל אחרים.',
    accent: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-600',
  },
  {
    icon: MessageSquareOff,
    title: 'שעות של הקלדה ידנית ב-CRM',
    body: 'אחרי כל שיחה — מתווכים מקלידים ידנית מי, מה, איפה, תקציב. רוב הזמן זה לא קורה ולידים נופלים בין הכיסאות.',
    accent: 'from-rose-500/10 to-pink-500/10',
    iconColor: 'text-rose-600',
  },
  {
    icon: XCircle,
    title: 'פולואפים שנשכחים',
    body: '"חזרו אלי עוד שבועיים" — ואז כולם שוכחים. לידים פושרים שצריך לחמם נופלים סטטיסטית בלי תזכורת אוטומטית.',
    accent: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-600',
  },
  {
    icon: AlertCircle,
    title: 'גיוס דירות בידיים — איטי, יקר',
    body: 'בעלי דירות שלא מתחילים תהליך מכירה כי אף אחד לא ליווה אותם. שיחות גישוש חוזרות שגוזלות שעות בשבוע.',
    accent: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-blue-600',
  },
];

export function PainPoints() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">הבעיה</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            מכיר/ה את התסכול הזה?
          </h2>
          <p className="text-lg text-muted-foreground">
            רוב משרדי התיווך בישראל מאבדים <span className="text-foreground font-semibold">40-60% מהלידים</span>.
            לא בגלל איכות — בגלל זמן.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {PAINS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="group relative rounded-2xl border bg-card p-6 shadow-soft hover:shadow-lift transition-all hover:-translate-y-0.5"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background border ${p.iconColor} mb-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
