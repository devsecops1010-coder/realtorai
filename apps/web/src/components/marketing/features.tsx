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
  {
    icon: Sparkles,
    title: 'שני סוכני AI מותאמים אישית',
    body: 'מענה ללידים נכנסים + גיוס בעלי דירות. תסריטים שלך, בטון שלך, עם הכללים שלך.',
  },
  {
    icon: PhoneCall,
    title: 'מענה WhatsApp ושיחות (בקרוב)',
    body: 'תמיכה ב-Twilio, Meta Cloud API ו-360dialog. תמיכה בקול דרך Vapi/Retell בהמשך.',
  },
  {
    icon: Layers,
    title: 'CRM מובנה',
    body: 'לידים, נכסים, שיחות, משימות — הכל במקום אחד. בלי כפל מערכות.',
  },
  {
    icon: Zap,
    title: 'התראות בזמן אמת',
    body: 'ליד חם, בקשה לאדם, פולואפ דחוף — מקבל את זה ברגע שזה קורה. בלי החמצות.',
  },
  {
    icon: Globe,
    title: 'עברית מלאה ו-RTL',
    body: 'הסוכן כותב עברית טבעית — לא תרגום אוטומטי. ה-Dashboard מותאם RTL מלא.',
  },
  {
    icon: Lock,
    title: 'מולטי-טננט מאובטח',
    body: 'הפרדה מלאה בין משרדים. רק אתה רואה את הלידים שלך. audit log על כל פעולה.',
  },
  {
    icon: HeadphonesIcon,
    title: 'תמיכה אנושית',
    body: 'תמיכה בעברית, ליווי הקמה, התאמת תסריטים. לא מורידים אותך מהקו אחרי החתימה.',
  },
  {
    icon: CheckCircle2,
    title: 'ללא התחייבות',
    body: '30 יום ניסיון. אם לא ראית 3 פגישות חמות בחודש הראשון — תקבל את הכסף בחזרה.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">מה אתה מקבל</h2>
          <p className="text-lg text-muted-foreground">
            פלטפורמה שלמה — לא Bot של מדף.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-lg border bg-card p-5">
                <Icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
