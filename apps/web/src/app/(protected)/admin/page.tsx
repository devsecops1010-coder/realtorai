'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Building2,
  CheckCircle2,
  Users,
  MessageSquare,
  ArrowLeft,
  Activity,
  KeyRound,
  Loader2,
  Sparkles,
  UserRound,
  Plus,
  X,
} from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RevenueSummary {
  mrr: number;
  tenantCount: number;
  activeTenantCount: number;
  tenants: {
    id: string;
    name: string;
    status: string;
    monthlyPlanIls: number;
    setupFeeIls: number;
  }[];
}

interface PlatformHealth {
  tenants: number;
  activeTenants: number;
  leadsLast24h: number;
  messagesLast24h: number;
  openHandoffs: number;
}

interface UsageRow {
  tenantId: string;
  name: string;
  status: string;
  plan: string;
  byType: Record<string, { quantity: number; costEstimate: string }>;
}

interface SetupOfficeResponse {
  tenant: { id: string; name: string; status: string; plan: string; monthlyPlanIls: number; setupFeeIls: number };
  office: { id: string; name: string; city: string | null };
  owner: { id: string; name: string; email: string; role: string; status: string };
  agents: { id: string; type: string; name: string; status: string }[];
}

interface StatDef {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  iconColor: string;
  // Stat cards link to deep-dive views. Where a per-tenant filter is the
  // natural drilldown we anchor to #tenants on the same page; future work
  // can add /admin/tenants/[id] for full tenant detail.
  href: string;
}

const INITIAL_SETUP_FORM = {
  tenantName: '',
  tenantStatus: 'trial',
  plan: 'starter',
  // New catalog-backed slug. If set, the API uses the PlanCatalog row + its
  // billing defaults. Legacy `plan` string remains as a fallback / display.
  planSlug: '',
  setupFeeIls: '',
  monthlyPlanIls: '',
  includedMessages: '',
  includedCallMinutes: '',
  monthlyLlmBudgetUsd: '',
  officeName: '',
  city: '',
  areas: '',
  // Catalog-backed area picker. The legacy free-text `areas` field stays
  // synced from the picked names for backward-compat.
  areaIds: [] as string[],
  phone: '',
  whatsappNumber: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerPassword: '',
};

interface CatalogPlan {
  id: string;
  slug: string;
  nameHe: string;
  monthlyPlanIls: number;
}
interface CatalogArea {
  id: string;
  slug: string;
  nameHe: string;
  region: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [setupForm, setSetupForm] = useState(INITIAL_SETUP_FORM);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<SetupOfficeResponse | null>(null);
  const [planCatalog, setPlanCatalog] = useState<CatalogPlan[]>([]);
  const [areaCatalog, setAreaCatalog] = useState<CatalogArea[]>([]);
  // Setup form is collapsed by default — the admin overview should lead with
  // the stats + tenants table, not a 12-field form. Toggle expands it.
  const [setupOpen, setSetupOpen] = useState(false);

  async function loadAdminData() {
    const [h, r, ur] = await Promise.all([
      api<PlatformHealth>('/admin/health'),
      api<RevenueSummary>('/admin/revenue'),
      api<UsageRow[]>('/admin/usage'),
    ]);
    setHealth(h);
    setRevenue(r);
    setUsage(ur);
  }

  useEffect(() => {
    const u = getCurrentUser();
    if (u?.role !== 'platform_admin' && u?.role !== 'platform_owner') {
      router.replace('/dashboard');
      return;
    }
    (async () => {
      try {
        await loadAdminData();
        // Catalogs are platform-wide and small — load in parallel and don't
        // gate the page on success (form falls back to free-text input).
        const [plans, areas] = await Promise.all([
          api<CatalogPlan[]>('/catalog/plans').catch(() => [] as CatalogPlan[]),
          api<CatalogArea[]>('/catalog/areas').catch(() => [] as CatalogArea[]),
        ]);
        setPlanCatalog(plans);
        setAreaCatalog(areas);
      } catch {
        setForbidden(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function updateSetupField<K extends keyof typeof INITIAL_SETUP_FORM>(
    key: K,
    value: (typeof INITIAL_SETUP_FORM)[K],
  ) {
    setSetupForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAreaId(id: string) {
    setSetupForm((current) => {
      const has = current.areaIds.includes(id);
      const next = has ? current.areaIds.filter((x) => x !== id) : [...current.areaIds, id];
      // Sync the legacy `areas` text field with the picked names so the
      // backend's denormalization still works even if the server doesn't
      // accept areaIds yet (e.g. canary build).
      const nameMap = new Map(areaCatalog.map((a) => [a.id, a.nameHe]));
      const labels = next.map((x) => nameMap.get(x)).filter(Boolean) as string[];
      return { ...current, areaIds: next, areas: labels.join(', ') };
    });
  }

  function optionalNumber(value: string) {
    const clean = value.trim();
    if (!clean) return undefined;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetupLoading(true);
    setSetupError(null);
    setSetupResult(null);

    try {
      const result = await api<SetupOfficeResponse>('/admin/offices/setup', {
        method: 'POST',
        body: {
          tenantName: setupForm.tenantName.trim(),
          tenantStatus: setupForm.tenantStatus,
          // Send both legacy + catalog plan: server prefers planSlug when set.
          plan: setupForm.plan.trim(),
          planSlug: setupForm.planSlug.trim() || undefined,
          setupFeeIls: optionalNumber(setupForm.setupFeeIls),
          monthlyPlanIls: optionalNumber(setupForm.monthlyPlanIls),
          includedMessages: optionalNumber(setupForm.includedMessages),
          includedCallMinutes: optionalNumber(setupForm.includedCallMinutes),
          monthlyLlmBudgetUsd: optionalNumber(setupForm.monthlyLlmBudgetUsd),
          officeName: setupForm.officeName.trim(),
          city: setupForm.city.trim() || undefined,
          // Free-text fallback (legacy clients) + catalog UUIDs (preferred).
          areas: setupForm.areas
            .split(',')
            .map((area) => area.trim())
            .filter(Boolean),
          areaIds: setupForm.areaIds.length > 0 ? setupForm.areaIds : undefined,
          phone: setupForm.phone.trim() || undefined,
          whatsappNumber: setupForm.whatsappNumber.trim() || undefined,
          ownerName: setupForm.ownerName.trim(),
          ownerEmail: setupForm.ownerEmail.trim(),
          ownerPhone: setupForm.ownerPhone.trim() || undefined,
          ownerPassword: setupForm.ownerPassword,
        },
      });
      setSetupResult(result);
      setSetupForm(INITIAL_SETUP_FORM);
      // Auto-collapse after a successful create — the success banner moves
      // to the now-compact header, keeping the page lean for the next action.
      setSetupOpen(false);
      await loadAdminData();
    } catch (error) {
      setSetupError(error instanceof ApiError ? error.message : 'הקמת המשרד נכשלה');
    } finally {
      setSetupLoading(false);
    }
  }

  if (forbidden) return <div className="text-destructive">אין הרשאה לדף זה.</div>;
  if (loading || !health || !revenue) return <div>טוען...</div>;

  const stats: StatDef[] = [
    { label: 'MRR (₪)',       value: revenue.mrr.toLocaleString(),  icon: Banknote,       bg: 'from-emerald-500/15 to-emerald-500/0', iconColor: 'text-emerald-600', href: '#tenants' },
    { label: 'משרדים',         value: health.tenants,                 icon: Building2,      bg: 'from-blue-500/15 to-blue-500/0',       iconColor: 'text-blue-600',    href: '#tenants' },
    { label: 'פעילים',         value: health.activeTenants,           icon: CheckCircle2,   bg: 'from-violet-500/15 to-violet-500/0',   iconColor: 'text-violet-600',  href: '#tenants-active' },
    { label: 'לידים 24ש',      value: health.leadsLast24h,            icon: Users,          bg: 'from-amber-500/15 to-amber-500/0',     iconColor: 'text-amber-600',   href: '/leads' },
    { label: 'הודעות 24ש',     value: health.messagesLast24h,         icon: MessageSquare,  bg: 'from-cyan-500/15 to-cyan-500/0',       iconColor: 'text-cyan-600',    href: '/conversations' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin — סקירת פלטפורמה</h1>

      <Card className={`border-primary/20 shadow-soft ${setupOpen ? '' : 'hover:border-primary/40 transition-colors'}`}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              הקמת משרד חדש
            </CardTitle>
            <div className="flex items-center gap-2">
              {setupResult && !setupOpen ? (
                <span className="hidden sm:inline text-xs text-emerald-700 bg-emerald-500/10 rounded-md px-2 py-1">
                  ✓ {setupResult.tenant.name}
                </span>
              ) : null}
              <Badge variant="secondary" className="hidden md:inline-flex">Tenant + Office + Owner</Badge>
              <Button
                type="button"
                variant={setupOpen ? 'ghost' : 'default'}
                size="sm"
                onClick={() => {
                  setSetupOpen((open) => !open);
                  if (setupOpen) {
                    // Closing — clear inline error so a stale message doesn't
                    // pop back when the form is re-opened.
                    setSetupError(null);
                  }
                }}
                className="gap-1.5"
                aria-expanded={setupOpen}
                aria-controls="setup-office-form"
              >
                {setupOpen ? (
                  <>
                    <X className="h-4 w-4" />
                    סגור
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    משרד חדש
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {setupOpen ? (
        <CardContent id="setup-office-form">
          <form onSubmit={handleSetupSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <SetupField id="tenantName" label="שם לקוח / רשת">
                <Input
                  id="tenantName"
                  value={setupForm.tenantName}
                  onChange={(event) => updateSetupField('tenantName', event.target.value)}
                  required
                />
              </SetupField>
              <SetupField id="tenantStatus" label="סטטוס">
                <select
                  id="tenantStatus"
                  value={setupForm.tenantStatus}
                  onChange={(event) => updateSetupField('tenantStatus', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="trial">trial</option>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </SetupField>
              <SetupField id="plan" label="תוכנית">
                {planCatalog.length > 0 ? (
                  <select
                    id="plan"
                    value={setupForm.planSlug || setupForm.plan}
                    onChange={(event) => {
                      const slug = event.target.value;
                      const plan = planCatalog.find((p) => p.slug === slug);
                      setSetupForm((cur) => ({
                        ...cur,
                        planSlug: slug,
                        plan: slug,
                        // Pre-fill the billing fields from the catalog so the
                        // admin sees the auto-applied values immediately.
                        monthlyPlanIls: plan ? String(plan.monthlyPlanIls) : cur.monthlyPlanIls,
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— בחר תוכנית —</option>
                    {planCatalog.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.nameHe} ({p.monthlyPlanIls === 0 ? 'חינם' : `₪${p.monthlyPlanIls.toLocaleString()}`})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="plan"
                    value={setupForm.plan}
                    onChange={(event) => updateSetupField('plan', event.target.value)}
                    required
                  />
                )}
              </SetupField>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SetupField id="setupFeeIls" label="הקמה ₪">
                <Input
                  id="setupFeeIls"
                  type="number"
                  min="0"
                  value={setupForm.setupFeeIls}
                  onChange={(event) => updateSetupField('setupFeeIls', event.target.value)}
                />
              </SetupField>
              <SetupField id="monthlyPlanIls" label="חודשי ₪">
                <Input
                  id="monthlyPlanIls"
                  type="number"
                  min="0"
                  value={setupForm.monthlyPlanIls}
                  onChange={(event) => updateSetupField('monthlyPlanIls', event.target.value)}
                />
              </SetupField>
              <SetupField id="includedMessages" label="הודעות כלולות">
                <Input
                  id="includedMessages"
                  type="number"
                  min="0"
                  value={setupForm.includedMessages}
                  onChange={(event) => updateSetupField('includedMessages', event.target.value)}
                />
              </SetupField>
              <SetupField id="includedCallMinutes" label="דקות כלולות">
                <Input
                  id="includedCallMinutes"
                  type="number"
                  min="0"
                  value={setupForm.includedCallMinutes}
                  onChange={(event) => updateSetupField('includedCallMinutes', event.target.value)}
                />
              </SetupField>
              <SetupField id="monthlyLlmBudgetUsd" label="תקציב LLM $">
                <Input
                  id="monthlyLlmBudgetUsd"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={setupForm.monthlyLlmBudgetUsd}
                  onChange={(event) => updateSetupField('monthlyLlmBudgetUsd', event.target.value)}
                />
              </SetupField>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <SetupField id="officeName" label="שם משרד">
                <Input
                  id="officeName"
                  value={setupForm.officeName}
                  onChange={(event) => updateSetupField('officeName', event.target.value)}
                  required
                />
              </SetupField>
              <SetupField id="city" label="עיר">
                <Input
                  id="city"
                  value={setupForm.city}
                  onChange={(event) => updateSetupField('city', event.target.value)}
                />
              </SetupField>
              <SetupField id="areas" label="אזורים">
                {areaCatalog.length > 0 ? (
                  <AreaPicker
                    selected={setupForm.areaIds}
                    areas={areaCatalog}
                    onToggle={toggleAreaId}
                  />
                ) : (
                  <Input
                    id="areas"
                    value={setupForm.areas}
                    onChange={(event) => updateSetupField('areas', event.target.value)}
                    placeholder="מרכז, צפון ישן"
                  />
                )}
              </SetupField>
              <SetupField id="whatsappNumber" label="WhatsApp">
                <Input
                  id="whatsappNumber"
                  value={setupForm.whatsappNumber}
                  onChange={(event) => updateSetupField('whatsappNumber', event.target.value)}
                />
              </SetupField>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <SetupField id="ownerName" label="בעל משרד">
                <Input
                  id="ownerName"
                  value={setupForm.ownerName}
                  onChange={(event) => updateSetupField('ownerName', event.target.value)}
                  required
                />
              </SetupField>
              <SetupField id="ownerEmail" label="אימייל בעלים">
                <Input
                  id="ownerEmail"
                  type="email"
                  value={setupForm.ownerEmail}
                  onChange={(event) => updateSetupField('ownerEmail', event.target.value)}
                  required
                />
              </SetupField>
              <SetupField id="ownerPhone" label="טלפון בעלים">
                <Input
                  id="ownerPhone"
                  value={setupForm.ownerPhone}
                  onChange={(event) => updateSetupField('ownerPhone', event.target.value)}
                />
              </SetupField>
              <SetupField id="ownerPassword" label="סיסמה זמנית">
                <Input
                  id="ownerPassword"
                  type="password"
                  value={setupForm.ownerPassword}
                  onChange={(event) => updateSetupField('ownerPassword', event.target.value)}
                  required
                />
              </SetupField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                <span>הבעלים ייווצר כ־office_owner פעיל</span>
                <KeyRound className="h-4 w-4" />
              </div>
              <Button type="submit" disabled={setupLoading}>
                {setupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                הקם משרד ובעלים
              </Button>
            </div>

            {setupError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {setupError}
              </div>
            ) : null}

            {setupResult ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                <span>
                  נוצר: {setupResult.tenant.name} / {setupResult.office.name} / {setupResult.owner.email}
                </span>
                <Link href={`/admin/tenants/${setupResult.tenant.id}`} className="font-medium text-primary">
                  פתח לקוח
                </Link>
              </div>
            ) : null}
          </form>
        </CardContent>
        ) : (
        // Collapsed view — last successful create is surfaced as a quick link
        // so the admin can jump straight to the new tenant.
        setupResult ? (
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
              <span>
                נוצר לאחרונה: {setupResult.tenant.name} / {setupResult.office.name}
              </span>
              <Link href={`/admin/tenants/${setupResult.tenant.id}`} className="font-medium text-primary">
                פתח לקוח →
              </Link>
            </div>
          </CardContent>
        ) : null
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
            >
              <Card className="relative overflow-hidden h-full hover:shadow-lift hover:-translate-y-0.5 hover:border-primary/40 transition-all border-border/60 shadow-soft cursor-pointer">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-100 pointer-events-none`} />
                <CardHeader className="pb-2 relative">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                    <Icon className={`h-5 w-5 ${s.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold tracking-tight">{s.value}</div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/catalog/plans"
          className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
        >
          <Card className="hover:border-primary/40 transition shadow-soft">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">קטלוג תוכניות</p>
                <p className="text-xs text-muted-foreground">
                  {planCatalog.length} תוכניות בקטלוג
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/admin/catalog/areas"
          className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
        >
          <Card className="hover:border-primary/40 transition shadow-soft">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">קטלוג אזורים</p>
                <p className="text-xs text-muted-foreground">
                  {areaCatalog.length} אזורים בקטלוג
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card id="tenants">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            משרדים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תוכנית</TableHead>
                <TableHead>הקמה (₪)</TableHead>
                <TableHead>חודשי (₪)</TableHead>
                <TableHead>טוקנים החודש</TableHead>
                <TableHead>הודעות החודש</TableHead>
                <TableHead>עלות מוערכת ($)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenue.tenants.map((t) => {
                const u = usage.find((x) => x.tenantId === t.id);
                const llm = u?.byType['llm_tokens'];
                const wa = u?.byType['whatsapp_message'];
                const cost =
                  (llm ? parseFloat(llm.costEstimate) : 0) +
                  (wa ? parseFloat(wa.costEstimate) : 0);
                return (
                  <TableRow
                    key={t.id}
                    id={t.status === 'active' ? 'tenants-active' : undefined}
                    className="cursor-pointer group hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/admin/tenants/${t.id}`)}
                  >
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'active' ? 'success' : 'outline'}>{t.status}</Badge>
                    </TableCell>
                    <TableCell>{u?.plan ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">{t.setupFeeIls?.toLocaleString() ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{t.monthlyPlanIls?.toLocaleString() ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{llm?.quantity ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{wa?.quantity ?? 0}</TableCell>
                    <TableCell className="tabular-nums">${cost.toFixed(4)}</TableCell>
                    <TableCell>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SetupField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * Inline area picker — collapsed list of currently-selected chips with a
 * "+ הוסף" button that toggles a search popover. Keeps the form compact even
 * when the office spans a dozen areas.
 */
function AreaPicker({
  selected,
  areas,
  onToggle,
}: {
  selected: string[];
  areas: CatalogArea[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedAreas = areas.filter((a) => selected.includes(a.id));
  const filtered = areas.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.nameHe.toLowerCase().includes(q) ||
      a.region?.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative">
      <div className="min-h-[40px] flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background items-center">
        {selectedAreas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onToggle(a.id)}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs hover:bg-primary/20 transition"
          >
            {a.nameHe}
            <span aria-hidden>×</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-full px-2 py-0.5"
        >
          + הוסף
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש אזור..."
            className="w-full px-3 py-2 text-sm border-b bg-background"
          />
          <div className="py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">לא נמצא</p>
            )}
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onToggle(a.id);
                  setQuery('');
                }}
                className={`w-full text-right px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between ${
                  selected.includes(a.id) ? 'bg-primary/5' : ''
                }`}
              >
                <span>{a.nameHe}</span>
                <span className="text-xs text-muted-foreground">{a.region ?? ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
