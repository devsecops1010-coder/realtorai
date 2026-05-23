'use client';

// First-run onboarding wizard. Shown once per user on the dashboard.
//
// Why a modal rather than a wizard route:
//   - The dashboard is already populated (we created an office + the owner
//     user as part of register-tenant). The user can leave at any step and
//     come back to a working app — the wizard is a *guide*, not a gate.
//   - A modal keeps the rest of the UI visible behind it, so the user can
//     see the structure of the app they're about to fill in.
//
// Completion tracking is local-first (localStorage `rai_onboarded_v1`).
// We don't persist it server-side yet — the cost of re-showing once after a
// browser cache clear is much smaller than adding a column + migration.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Building2,
  UserPlus,
  Users,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthUser, Office } from '@/lib/types';

const STORAGE_KEY = 'rai_onboarded_v1';

type Step = 'welcome' | 'office' | 'invite' | 'lead' | 'done';

const STEP_ORDER: Step[] = ['welcome', 'office', 'invite', 'lead', 'done'];

// Roles eligible for "office team" invites in the wizard. Limited to the
// roles a brand-new tenant typically adds first — power roles (admin/CEO)
// are excluded so the wizard can't accidentally over-privilege a teammate.
const INVITABLE_ROLES = [
  { value: 'realtor', label: 'מתווך' },
  { value: 'mortgage_advisor', label: 'יועץ משכנתאות' },
  { value: 'secretary', label: 'מזכירה' },
  { value: 'office_manager', label: 'מנהל סניף' },
];

export function OnboardingWizard({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('welcome');

  // Decide on mount whether to surface the wizard at all. Skip if:
  //   - localStorage flag already set (user dismissed previously)
  //   - the user is below office-management level (their employer should
  //     handle the onboarding; showing it to a junior is just noise)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) return;
    const eligibleRoles = [
      'platform_owner',
      'platform_admin',
      'ceo',
      'deputy_ceo',
      'office_owner',
      'office_manager',
      'branch_manager',
    ];
    if (!eligibleRoles.includes(user.role)) return;
    // Defer a tick so the rest of the dashboard renders first — otherwise
    // the modal flashes before the layout settles.
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [user.role]);

  function finish() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  }

  function next() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }
  function prev() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      // Click outside dismisses but doesn't mark complete — so the user can
      // step away to look at something and come back.
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-bold">ברוך הבא ל-Realtorai</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="סגור"
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-2 text-xs border-b bg-muted/40">
          <StepDot step={1} active={step === 'welcome'} done={STEP_ORDER.indexOf(step) > 0} label="התחלה" />
          <ChevronGap />
          <StepDot step={2} active={step === 'office'} done={STEP_ORDER.indexOf(step) > 1} label="סניף" />
          <ChevronGap />
          <StepDot step={3} active={step === 'invite'} done={STEP_ORDER.indexOf(step) > 2} label="צוות" />
          <ChevronGap />
          <StepDot step={4} active={step === 'lead'} done={STEP_ORDER.indexOf(step) > 3} label="ליד ראשון" />
        </div>

        <div className="p-5 min-h-[340px]">
          {step === 'welcome' && <WelcomeStep user={user} onContinue={next} onSkip={finish} />}
          {step === 'office' && <OfficeStep onContinue={next} onBack={prev} />}
          {step === 'invite' && <InviteStep onContinue={next} onBack={prev} />}
          {step === 'lead' && (
            <LeadStep
              onContinue={() => {
                finish();
                router.push('/leads/new');
              }}
              onBack={prev}
              onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronGap() {
  return <span className="text-muted-foreground">›</span>;
}

function StepDot({
  step,
  active,
  done,
  label,
}: {
  step: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${
        active
          ? 'bg-primary text-primary-foreground font-semibold'
          : done
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-muted-foreground'
      }`}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{step}</span>}
      {label}
    </span>
  );
}

function WelcomeStep({
  user,
  onContinue,
  onSkip,
}: {
  user: AuthUser;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h3 className="text-2xl font-bold">שלום {user.name.split(' ')[0]}!</h3>
        <p className="text-muted-foreground">
          בוא נגדיר את החשבון שלך תוך 3 דקות. נעבור על 3 צעדים קצרים — אפשר לדלג על כל אחד מהם בכל רגע.
        </p>
      </div>

      <div className="grid gap-2 text-sm">
        <ChecklistItem icon={Building2} title="הגדרת הסניף" body="כתובת, טלפון, אזורי פעילות" />
        <ChecklistItem icon={UserPlus} title="הזמנת חברי צוות" body="המתווכים, מזכירה, יועץ משכנתאות" />
        <ChecklistItem icon={Users} title="ליד ראשון" body="הוסף ליד ידנית או חבר את הטופס שלך" />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          דלג להמשך
        </Button>
        <Button onClick={onContinue} className="gap-2">
          בוא נתחיל <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChecklistItem({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      <Icon className="h-5 w-5 text-primary mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function OfficeStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const [office, setOffice] = useState<Office | null>(null);
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [areas, setAreas] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pull the current office (auto-created during register-tenant) so the
  // form pre-fills with whatever defaults the user already has.
  useEffect(() => {
    api<Office>('/offices/current')
      .then((o) => {
        setOffice(o);
        setCity(o.city ?? '');
        setPhone(o.phone ?? '');
        setWhatsapp(o.whatsappNumber ?? '');
        setAreas((o.areas ?? []).join(', '));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!office) return;
    setSaving(true);
    try {
      await api(`/offices/current`, {
        method: 'PATCH',
        body: {
          city: city || undefined,
          phone: phone || undefined,
          whatsappNumber: whatsapp || undefined,
          // Free-text areas — the catalog-backed flow is separate. This is
          // intentionally lightweight for first-run; users can refine later.
          areas: areas ? areas.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        },
      });
      toast.success('פרטי הסניף נשמרו');
      onContinue();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold mb-1">סניף — {office?.name ?? '...'}</h3>
        <p className="text-sm text-muted-foreground">
          הפרטים שיוצגו ללידים שלך ויאוזכרו במכתבים אוטומטיים.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">טוען...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">עיר</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="תל אביב" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">טלפון משרד</Label>
            <Input id="phone" value={phone} dir="ltr" onChange={(e) => setPhone(e.target.value)} placeholder="03-1234567" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa">WhatsApp עסקי</Label>
            <Input id="wa" value={whatsapp} dir="ltr" onChange={(e) => setWhatsapp(e.target.value)} placeholder="+972501234567" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="areas">אזורי פעילות (מופרדים בפסיק)</Label>
            <Input id="areas" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="תל אביב, רמת גן, גבעתיים" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowRight className="h-4 w-4" /> חזור
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onContinue}>
            דלג
          </Button>
          <Button onClick={save} disabled={saving || !office} className="gap-2">
            שמור והמשך <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InviteStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('realtor');
  const [sending, setSending] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);

  async function invite() {
    if (!name || !email) return;
    setSending(true);
    try {
      await api('/users/invite', {
        method: 'POST',
        body: { name, email, role },
      });
      setInvited((prev) => [...prev, `${name} (${email})`]);
      setName('');
      setEmail('');
      toast.success('הזמנה נשלחה');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'שליחה נכשלה');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold mb-1">הזמן את הצוות</h3>
        <p className="text-sm text-muted-foreground">
          כל אחד יקבל מייל עם קישור פעיל למשך 7 ימים. אפשר להוסיף מאוחר יותר.
        </p>
      </div>

      <div className="grid gap-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="email@example.com"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex-1 h-10 rounded-md border bg-background px-3 text-sm"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Button onClick={invite} disabled={sending || !name || !email}>
            <UserPlus className="h-4 w-4 ml-1" /> הוסף
          </Button>
        </div>
      </div>

      {invited.length > 0 && (
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
          <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            נשלחו {invited.length} הזמנות:
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {invited.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-3">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowRight className="h-4 w-4" /> חזור
        </Button>
        <Button onClick={onContinue} className="gap-2">
          {invited.length > 0 ? 'המשך' : 'דלג'} <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LeadStep({
  onContinue,
  onBack,
  onFinish,
}: {
  onContinue: () => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  async function seedDemo() {
    setSeeding(true);
    try {
      const res = await api<{ created: { leads: number; properties: number } }>(
        '/onboarding/sample-data',
        { method: 'POST' },
      );
      toast.success(
        `נוצרו ${res.created.leads} לידים ו-${res.created.properties} נכסי דמו`,
      );
      onFinish();
      router.push('/leads');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'יצירת דמו נכשלה');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold mb-1">הליד הראשון שלך</h3>
        <p className="text-sm text-muted-foreground">
          בוא נכניס למערכת ליד — או נטען נתוני דמו כדי לראות את כל הפיצ'רים במכת אחת.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="text-right border-2 border-primary rounded-lg p-4 hover:bg-primary/5 transition-colors"
        >
          <Users className="h-6 w-6 text-primary mb-2" />
          <p className="font-semibold mb-1">הוסף ליד ידנית</p>
          <p className="text-xs text-muted-foreground">צור ליד אמיתי בטופס</p>
        </button>
        <button
          type="button"
          onClick={seedDemo}
          disabled={seeding}
          className="text-right border-2 border-fuchsia-500 rounded-lg p-4 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/20 transition-colors disabled:opacity-50"
        >
          <Sparkles className="h-6 w-6 text-fuchsia-500 mb-2" />
          <p className="font-semibold mb-1">{seeding ? 'יוצר...' : 'טען נתוני דמו'}</p>
          <p className="text-xs text-muted-foreground">
            5 לידים, 3 נכסים, פרופיל משכנתאות
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            onFinish();
          }}
          className="text-right border rounded-lg p-4 hover:bg-muted transition-colors"
        >
          <CheckCircle2 className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="font-semibold mb-1">סיים בלי</p>
          <p className="text-xs text-muted-foreground">אחזור מאוחר יותר</p>
        </button>
      </div>

      <div className="flex items-center justify-between pt-3">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowRight className="h-4 w-4" /> חזור
        </Button>
      </div>
    </div>
  );
}
