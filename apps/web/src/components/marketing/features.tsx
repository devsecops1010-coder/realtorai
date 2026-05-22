import {
  CheckCircle2,
  Globe,
  HeadphonesIcon,
  Layers,
  Lock,
  PhoneCall,
  Sparkles,
  Zap,
} from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, title: 'שני סוכני AI', body: 'מענה ללידים + גיוס בעלי דירות. תסריטים שלך, טון שלך.' },
  { icon: PhoneCall, title: 'WhatsApp + שיחות', body: 'Twilio, Meta Cloud, 360dialog. קול דרך Vapi/Retell בהמשך.' },
  { icon: Layers, title: 'CRM מובנה', body: 'לידים, נכסים, שיחות, משימות — הכל במקום אחד.' },
  { icon: Zap, title: 'התראות בזמן אמת', body: 'ליד חם, בקשה לאדם, פולואפ דחוף — מגיע אליך מיד.' },
  { icon: Globe, title: 'עברית מלאה RTL', body: 'הסוכן כותב עברית טבעית. Dashboard בכיוונית עברית מלאה.' },
  { icon: Lock, title: 'מולטי-טננט מאובטח', body: 'הפרדה מלאה בין משרדים. audit log על כל פעולה.' },
  { icon: HeadphonesIcon, title: 'תמיכה אנושית', body: 'ליווי הקמה, התאמת תסריטים, עזרה בעברית.' },
  { icon: CheckCircle2, title: 'ללא התחייבות', body: '30 יום ניסיון. החזר אם לא ראית 3 פגישות חמות בחודש הראשון.' },
];

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">המוצר</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            פלטפורמה שלמה.
            <br />
            <span className="text-gradient">לא bot של מדף.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            כל מה שמשרד תיווך צריך כדי לתפעל יותר לידים, בפחות זמן.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border bg-card p-5 shadow-soft hover:shadow-lift transition-all hover:-translate-y-0.5"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-fuchsia-500/10 mb-3 group-hover:from-primary/20 group-hover:to-fuchsia-500/20 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
