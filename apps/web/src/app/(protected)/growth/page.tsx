'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  FileSignature,
  Film,
  Loader2,
  Megaphone,
  Receipt,
  Rocket,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type IntegrationStatus = 'api_ready' | 'manual_ready' | 'needs_setup' | 'planned';

interface GrowthOverview {
  mission: string;
  stats: {
    properties: number;
    activeProperties: number;
    draftProperties: number;
    saleProperties: number;
    rentProperties: number;
    integrationsReadyForPlanning: number;
  };
  pipeline: string[];
  integrations: {
    key: string;
    label: string;
    category: 'portal' | 'social' | 'invoice' | 'signature' | 'video' | 'website';
    status: IntegrationStatus;
    mode: string;
    notes: string;
  }[];
  recentProperties: {
    id: string;
    title: string;
    city: string | null;
    area: string | null;
    dealType: string;
    status: string;
    price: string | null;
    ownerName: string | null;
  }[];
}

interface GrowthLaunchPlan {
  property: GrowthOverview['recentProperties'][number];
  readiness: {
    score: number;
    checks: { key: string; label: string; ok: boolean }[];
  };
  landingPage: {
    slug: string;
    title: string;
    seoTitle: string;
    description: string;
    sections: string[];
  };
  portals: { portal: string; action: string; status: string }[];
  socialQueue: { platform: string; format: string; cadence: string; copy: string }[];
  videoBrief: { title: string; aspectRatios: string[]; voiceover: string[]; scenes: string[] };
  organicPlan: { day: number; action: string; asset: string }[];
  contractFlow: { template: string; requiredFields: string[]; signatureSteps: string[]; status: string };
  invoiceFlow: { trigger: string; documentTypes: string[]; providerMode: string; israelInvoices: string };
}

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  api_ready: 'API מוכן',
  manual_ready: 'מוכן ידנית',
  needs_setup: 'דורש חיבור ספק',
  planned: 'מתוכנן',
};

const STATUS_VARIANT: Record<IntegrationStatus, 'success' | 'warning' | 'outline' | 'secondary'> = {
  api_ready: 'success',
  manual_ready: 'success',
  needs_setup: 'warning',
  planned: 'outline',
};

const CATEGORY_ICON = {
  portal: Building2,
  social: Share2,
  invoice: Receipt,
  signature: FileSignature,
  video: Film,
  website: Rocket,
};

export default function GrowthPage() {
  const [overview, setOverview] = useState<GrowthOverview | null>(null);
  const [plan, setPlan] = useState<GrowthLaunchPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GrowthOverview>('/growth/overview')
      .then(setOverview)
      .catch((e) => setError((e as ApiError).message))
      .finally(() => setLoading(false));
  }, []);

  async function loadPlan(propertyId: string) {
    setPlanLoading(propertyId);
    setError(null);
    try {
      const next = await api<GrowthLaunchPlan>(`/growth/properties/${propertyId}/launch-plan`);
      setPlan(next);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setPlanLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!overview) {
    return <div className="text-destructive">{error ?? 'לא ניתן לטעון את מרכז הצמיחה.'}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-gradient-to-l from-teal-900 via-cyan-900 to-slate-900 p-6 md:p-8 text-white shadow-lift">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <Badge className="bg-white/15 text-white border-white/20" variant="outline">
              <Sparkles className="h-3.5 w-3.5 ml-1" />
              Growth OS
            </Badge>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
              מרכז הפצה, חוזים, חשבוניות ותוכן
            </h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-white/80">{overview.mission}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <HeroMetric label="נכסים" value={overview.stats.properties} />
            <HeroMetric label="פעילים" value={overview.stats.activeProperties} />
            <HeroMetric label="חיבורים" value={overview.stats.integrationsReadyForPlanning} />
          </div>
        </div>
      </section>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FocusCard icon={Building2} title="אתר נכסים עצמאי" body="דפי נכס ודפי אזור לכל משרד כדי להקטין תלות בפורטלים." />
        <FocusCard
          icon={FileSignature}
          title="חוזה וחתימה"
          body="טיוטת חוזה, שליחה לחתימה, audit trail ושמירת PDF חתום."
          href="/documents"
        />
        <FocusCard icon={Receipt} title="חשבוניות" body="הכנה לחיבור ספק חשבוניות ותמיכה במספרי הקצאה כשנדרש." />
        <FocusCard icon={Film} title="וידאו AI" body="תסריט, קריינות, כתוביות ופורמטים לכל הרשתות." />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            מסלול עבודה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {overview.pipeline.map((step, index) => (
              <div key={step} className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-primary">שלב {index + 1}</div>
                <div className="mt-1 text-sm font-medium leading-6">{step}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              חיבורים ומודולים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.integrations.map((integration) => {
                const Icon = CATEGORY_ICON[integration.category];
                return (
                  <div key={integration.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{integration.label}</p>
                          <p className="text-sm text-muted-foreground leading-6">{integration.mode}</p>
                        </div>
                      </div>
                      <Badge variant={STATUS_VARIANT[integration.status]}>
                        {STATUS_LABEL[integration.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{integration.notes}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              נכסים להפצה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>נכס</TableHead>
                  <TableHead>מחיר</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentProperties.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      אין נכסים עדיין.
                    </TableCell>
                  </TableRow>
                )}
                {overview.recentProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <p className="font-medium">{property.title}</p>
                      <p className="text-xs text-muted-foreground">{[property.city, property.area].filter(Boolean).join(' / ') || 'מיקום חסר'}</p>
                    </TableCell>
                    <TableCell>{property.price ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={property.status === 'active' ? 'success' : 'secondary'}>{property.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => loadPlan(property.id)} disabled={planLoading === property.id}>
                        {planLoading === property.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                        תוכנית
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {plan && <LaunchPlan plan={plan} />}
    </div>
  );
}

function LaunchPlan({ plan }: { plan: GrowthLaunchPlan }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          תוכנית השקה: {plan.property.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <PlanTile title="מוכנות" value={`${plan.readiness.score}%`} />
          <PlanTile title="דף נכס" value={plan.landingPage.slug} />
          <PlanTile title="חוזה" value={plan.contractFlow.status} />
          <PlanTile title="חשבונית" value={plan.invoiceFlow.providerMode} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              תור פרסום אורגני
            </h3>
            <div className="mt-3 space-y-2">
              {plan.socialQueue.map((post) => (
                <div key={`${post.platform}-${post.cadence}`} className="rounded-md bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{post.platform}</Badge>
                    <span className="text-xs text-muted-foreground">{post.cadence}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{post.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              בריף סרטון
            </h3>
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">{plan.videoBrief.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.videoBrief.aspectRatios.map((ratio) => (
                  <Badge key={ratio} variant="secondary">{ratio}</Badge>
                ))}
              </div>
              <ol className="space-y-1 text-sm leading-6">
                {plan.videoBrief.voiceover.map((line, index) => (
                  <li key={line}>
                    {index + 1}. {line}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            בדיקות מוכנות
          </h3>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {plan.readiness.checks.map((check) => (
              <div key={check.key} className="rounded-md bg-muted/40 p-3 text-sm">
                <Badge variant={check.ok ? 'success' : 'warning'}>{check.ok ? 'תקין' : 'חסר'}</Badge>
                <p className="mt-2 font-medium">{check.label}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FocusCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href?: string;
}) {
  const inner = (
    <Card className={href ? 'cursor-pointer hover:border-primary/40 transition' : ''}>
      <CardContent className="p-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-3 font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur">
      <p className="text-[11px] text-white/65">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function PlanTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

