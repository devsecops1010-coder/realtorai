import {
  ArrowLeft,
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  HeadphonesIcon,
  Lock,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const CORE_FEATURES = [
  {
    icon: MessageSquareText,
    title: 'סוכן מענה ללידים',
    body: 'עונה בעברית, שואל תקציב/אזור/חדרים, מזהה כוונה ומעביר למתווך רק כשהלקוח באמת מתקדם.',
    meta: 'Inbound',
    accent: 'from-cyan-500/12 to-emerald-500/8',
  },
  {
    icon: Building2,
    title: 'סוכן גיוס דירות',
    body: 'פונה לבעלי נכסים, מתעד עניין, שומר opt-out ומייצר פגישה לבדיקת מכירה או השכרה.',
    meta: 'Recruiting',
    accent: 'from-emerald-500/12 to-amber-500/8',
  },
  {
    icon: BarChart3,
    title: 'CRM ומעקב',
    body: 'כל שיחה, ליד, נכס, משימה ופולו-אפ נשמרים לפי משרד, צוות ותפקיד.',
    meta: 'Operations',
    accent: 'from-sky-500/12 to-violet-500/8',
  },
  {
    icon: ShieldCheck,
    title: 'משכנתאות',
    body: 'זיהוי לקוחות שצריכים אישור עקרוני והעברה מסודרת ליועץ אחרי הסכמה.',
    meta: 'Mortgage',
    accent: 'from-amber-500/12 to-rose-500/8',
  },
];

const PLATFORM_FEATURES = [
  { icon: Lock, title: 'הרשאות לפי תפקיד', body: 'בעל משרד, מנהל, מתווך, שיווק, מזכירות, כספים וצופה.' },
  { icon: ClipboardList, title: 'Audit מלא', body: 'מעקב אחרי פעולות AI, משתמשים ושינויים רגישים.' },
  { icon: Zap, title: 'Router למודלים', body: 'חלוקת משימות בין מודלים כדי לשמור על איכות ועלות.' },
  { icon: PhoneCall, title: 'מוכן לקול', body: 'מבנה שמאפשר להוסיף Voice Agent כשיש תהליך יציב.' },
  { icon: HeadphonesIcon, title: 'ליווי הקמה', body: 'התאמת תסריטים, בדיקת שיחות ראשונות ודוחות שיפור.' },
  { icon: Bot, title: 'שכפול למשרדים', body: 'אותה תשתית לכל משרד עם התאמות תסריט והרשאות.' },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">המוצר</p>
          <h2 className="mb-5 text-4xl font-bold md:text-5xl">
            מערכת עבודה למשרד.
            <br />
            <span className="text-gradient">לא עוד צ׳אטבוט תלוש.</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            כל סוכן מחובר ל־CRM, להרשאות, למשימות ולדוחות. לכן בעל המשרד רואה מה קרה,
            מי צריך לטפל, ומה באמת התקדם.
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-4">
          {CORE_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>

        <div className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_FEATURES.map((feature) => (
            <PlatformCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
}: {
  feature: {
    icon: LucideIcon;
    title: string;
    body: string;
    meta: string;
    accent: string;
  };
}) {
  const Icon = feature.icon;
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lift">
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-md border bg-background">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground" dir="ltr">
            {feature.meta}
          </span>
        </div>
        <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
        <p className="text-sm leading-7 text-muted-foreground">{feature.body}</p>
        <ArrowLeft className="mt-5 h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-[-2px] group-hover:text-primary" />
      </div>
    </div>
  );
}

function PlatformCard({
  feature,
}: {
  feature: { icon: LucideIcon; title: string; body: string };
}) {
  const Icon = feature.icon;
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-4 transition-colors hover:border-primary/35">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold">{feature.title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.body}</p>
      </div>
    </div>
  );
}
