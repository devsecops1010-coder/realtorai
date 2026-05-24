'use client';

/**
 * Israeli multi-track mortgage calculator ("מחשבון תמהיל").
 *
 * Mirrors the UX of mashcantaman.co.il (the canonical IL mortgage
 * calculator): a single loan split into 3-5 simultaneous "tracks"
 * (פריים / קל\"צ / ק\"צ / etc), each with its own rate, term and method,
 * with live aggregate output and BoI-rule validation.
 *
 * Math lives in /lib/mortgage.ts — this file is purely UI + state.
 *
 * Layout:
 *   1. Top: total loan + scenario picker (single/replacement/investor).
 *      Same as the v1 single-rate calculator so users coming from /pricing
 *      or marketing don't lose their bearings.
 *   2. Mix section: 3 default tracks (קל\"צ + ק\"צ + פריים, ⅓ each).
 *      Add / remove tracks. Per-track inputs.
 *   3. Validation panel: BoI composition + sum-matches-loan checks.
 *   4. Aggregate summary card: first/peak monthly, total interest,
 *      total index cost, total repayment, cost per shekel.
 *   5. Monthly payment chart over the loan life.
 *   6. Foldable detail: year-by-year aggregate table.
 *
 * Why the schedule isn't always visible: a 25-year mortgage produces 300
 * rows. Showing them by default would overwhelm; the year-by-year fold
 * gives the same shape at 1/12 the noise.
 */

import { useMemo, useState } from 'react';
import {
  Banknote, AlertTriangle, Home, TrendingUp, Coins, Plus, Trash2, Info,
  ChevronDown, ChevronUp, PieChart, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TRACKS,
  defaultMix,
  amortize as _amortize,
  aggregateMix,
  summarizeTrack,
  validateMix,
  type TrackInput,
  type TrackKind,
  type RepayMethod,
} from '@/lib/mortgage';

type Scenario = 'single' | 'replacement' | 'investor';
const LTV_CAP: Record<Scenario, number> = { single: 0.75, replacement: 0.70, investor: 0.50 };

function formatIls(n: number, fractionDigits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(n);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function MortgageCalculator() {
  // Top-level loan setup (mirrors v1 calculator inputs for continuity).
  const [scenario, setScenario] = useState<Scenario>('single');
  const [price, setPrice] = useState(2_500_000);
  const [downPayment, setDownPayment] = useState(625_000);
  const totalLoan = Math.max(0, price - downPayment);
  const ltv = price > 0 ? (totalLoan / price) : 0;
  const ltvCap = LTV_CAP[scenario];
  const withinLtv = ltv <= ltvCap + 1e-9;

  // Track-level state. Initialized from defaultMix; user can rebalance.
  const [tracks, setTracks] = useState<TrackInput[]>(() => defaultMix(totalLoan));

  // When the loan total changes (price/down moved), we DON'T auto-rescale
  // tracks — that would clobber user edits silently. Instead we surface a
  // mismatch in the validation panel and offer a one-click rebalance.
  function autoRebalance() {
    setTracks(defaultMix(totalLoan, tracks[0]?.months ?? 300));
  }

  function updateTrack(id: string, patch: Partial<TrackInput>) {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function addTrack() {
    if (tracks.length >= 5) return;
    setTracks((prev) => [
      ...prev,
      {
        id: uid(),
        kind: 'var5_linked',
        method: 'shpitzer',
        principal: 0,
        annualRatePct: TRACKS.var5_linked.defaultRatePct,
        months: prev[0]?.months ?? 300,
        annualCpiPct: 2.5,
      },
    ]);
  }
  function removeTrack(id: string) {
    if (tracks.length <= 1) return;
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }

  // Aggregate + validation recompute on every input change. The math is
  // ~0.3ms for a 300-row schedule × 3-5 tracks, so no memoization headache.
  const validation = useMemo(() => validateMix(tracks, totalLoan), [tracks, totalLoan]);
  const aggregate = useMemo(() => aggregateMix(tracks), [tracks]);

  // For the income-required line we use a 35% DTI ceiling (banks expect
  // ≤30-40%; 35% is the conservative middle).
  const requiredIncome = aggregate.firstMonthlyPayment / 0.35;

  return (
    <div className="space-y-6">
      {/* ─── 1. Property scenario + loan setup ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4 text-primary" /> פרטי העסקה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-2">
            <ScenarioPill active={scenario === 'single'} onClick={() => setScenario('single')} icon={Home} title="דירה יחידה" subtitle="עד 75% מהשווי" />
            <ScenarioPill active={scenario === 'replacement'} onClick={() => setScenario('replacement')} icon={TrendingUp} title="דירה חלופית" subtitle="עד 70% מהשווי" />
            <ScenarioPill active={scenario === 'investor'} onClick={() => setScenario('investor')} icon={Coins} title="משקיע" subtitle="עד 50% מהשווי" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">מחיר הדירה (₪)</Label>
              <Input id="price" type="number" min={0} max={100_000_000} step={50_000}
                value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="down">הון עצמי (₪)</Label>
              <Input id="down" type="number" min={0} max={price} step={10_000}
                value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t">
            <Metric label="סכום ההלוואה" value={formatIls(totalLoan)} accent />
            <Metric label="יחס LTV" value={`${(ltv * 100).toFixed(1)}%`} hint={`מקס׳ ${(ltvCap * 100).toFixed(0)}%`} warning={!withinLtv} />
            <Metric label="הון עצמי נדרש מינ׳" value={formatIls(price * (1 - ltvCap))} />
          </div>

          {!withinLtv && (
            <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              <p className="text-rose-700 dark:text-rose-400">
                ההון העצמי נמוך מהמותר בקטגוריה זו. צריך לפחות{' '}
                <strong>{formatIls(price * (1 - ltvCap))}</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 2. Track mix ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" /> תמהיל המשכנתא
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={autoRebalance} className="text-xs">
                איזון אוטומטי ⅓-⅓-⅓
              </Button>
              <Button variant="outline" size="sm" onClick={addTrack} disabled={tracks.length >= 5} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> הוסף מסלול
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              canDelete={tracks.length > 1}
              onChange={(patch) => updateTrack(t.id, patch)}
              onRemove={() => removeTrack(t.id)}
            />
          ))}

          {validation.messages.length > 0 && (
            <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-1">
              <div className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                בדיקות תמהיל
              </div>
              <ul className="text-xs text-amber-700/80 dark:text-amber-400/80 pl-4 list-disc space-y-0.5">
                {validation.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 3. Aggregate summary ──────────────────────────────────────── */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="text-base">סיכום החזרים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-1">תשלום חודשי ראשון</p>
            <p className="text-4xl md:text-5xl font-bold text-gradient">
              {formatIls(aggregate.firstMonthlyPayment)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              נדרשת הכנסה חודשית של כ-{formatIls(requiredIncome)} (כלל הבנקים: 35% החזר מתוך הכנסה)
            </p>
            {aggregate.peakMonthlyPayment > aggregate.firstMonthlyPayment * 1.02 && (
              <p className="text-xs text-amber-600 mt-1">
                תשלום מקסימלי במהלך התקופה: <strong>{formatIls(aggregate.peakMonthlyPayment)}</strong>
                {' '}(עקב הצמדה / משתנה)
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="סך ההלוואה" value={formatIls(aggregate.totalPrincipal)} />
            <Metric label="סך ריבית" value={formatIls(aggregate.totalInterest)} />
            <Metric label="סך הצמדה" value={formatIls(aggregate.totalIndex)} hint="עלות תוספת מדד למסלולים צמודים" />
            <Metric
              label="סך החזר כולל"
              value={formatIls(aggregate.totalRepayment)}
              hint={`עלות לכל שקל הלוואה: ${(aggregate.totalRepayment / aggregate.totalPrincipal || 0).toFixed(2)} ₪`}
              accent
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. Per-track results ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">פירוט לפי מסלול</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-2 font-medium">מסלול</th>
                  <th className="text-right p-2 font-medium">קרן</th>
                  <th className="text-right p-2 font-medium">החזר ראשון</th>
                  <th className="text-right p-2 font-medium">החזר שיא</th>
                  <th className="text-right p-2 font-medium">סך ריבית</th>
                  <th className="text-right p-2 font-medium">סך החזר</th>
                </tr>
              </thead>
              <tbody>
                {aggregate.tracks.map((s, i) => {
                  const input = tracks[i];
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">
                        <Badge variant="secondary" className="text-xs">{TRACKS[s.kind].short}</Badge>
                      </td>
                      <td className="p-2 tabular-nums">{formatIls(input?.principal ?? 0)}</td>
                      <td className="p-2 tabular-nums">{formatIls(s.firstPayment)}</td>
                      <td className="p-2 tabular-nums">{formatIls(s.peakPayment)}</td>
                      <td className="p-2 tabular-nums text-muted-foreground">{formatIls(s.totalInterest)}</td>
                      <td className="p-2 tabular-nums font-medium">{formatIls(s.totalPayments)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. Chart: combined monthly payment over years ─────────────── */}
      <MonthlyChart points={aggregate.combinedMonthly} />

      {/* ─── 6. Foldable year-by-year aggregate table ──────────────────── */}
      <AnnualSchedule aggregate={aggregate} />

      {/* ─── 7. Disclaimer ─────────────────────────────────────────────── */}
      <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-amber-700 dark:text-amber-400">הסתייגות</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            המחשבון מציג הערכה. ריביות בפועל נקבעות בבנק לפי הכנסה, ביטחונות וגיל הלווים.
            במסלולים משתנים — הריבית עשויה להשתנות בעתיד; המחשבון מציג ריבית קבועה לאורך כל
            התקופה כדי לתת תמונה מייצגת. הצמדה למדד מחושבת לפי האינפלציה השנתית שהזנתם.
            לפני קבלת החלטה — היוועצו ביועץ משכנתאות מורשה.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrackRow({
  track, canDelete, onChange, onRemove,
}: {
  track: TrackInput;
  canDelete: boolean;
  onChange: (patch: Partial<TrackInput>) => void;
  onRemove: () => void;
}) {
  const meta = TRACKS[track.kind];
  const summary = summarizeTrack(track);

  // Out-of-recommended-range warning — soft hint, not a blocker. Real
  // borrowers get rates outside the range all the time.
  const rateOutOfRange =
    track.annualRatePct < meta.recommendedRange[0] ||
    track.annualRatePct > meta.recommendedRange[1];

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{meta.short}</Badge>
          <p className="text-xs text-muted-foreground hidden sm:block">{meta.description}</p>
        </div>
        {canDelete && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0" aria-label="הסר מסלול">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
        {/* Track type */}
        <div className="space-y-1">
          <Label className="text-xs">סוג מסלול</Label>
          <select
            value={track.kind}
            onChange={(e) => {
              const k = e.target.value as TrackKind;
              const newMeta = TRACKS[k];
              onChange({
                kind: k,
                annualRatePct: newMeta.defaultRatePct,
                annualCpiPct: newMeta.indexed ? (track.annualCpiPct ?? 2.5) : undefined,
              });
            }}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          >
            {Object.values(TRACKS).map((m) => (
              <option key={m.kind} value={m.kind}>{m.short}</option>
            ))}
          </select>
        </div>

        {/* Method */}
        <div className="space-y-1">
          <Label className="text-xs">שיטה</Label>
          <select
            value={track.method}
            onChange={(e) => onChange({ method: e.target.value as RepayMethod })}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="shpitzer">שפיצר (קבוע)</option>
            <option value="equal_principal">קרן שווה</option>
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <Label className="text-xs">סכום (₪)</Label>
          <Input
            type="number"
            min={0}
            step={10_000}
            value={track.principal || ''}
            onChange={(e) => onChange({ principal: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>

        {/* Term (months) */}
        <div className="space-y-1">
          <Label className="text-xs">תקופה (חודשים)</Label>
          <Input
            type="number"
            min={12}
            max={360}
            step={12}
            value={track.months}
            onChange={(e) => onChange({ months: Math.max(12, Math.min(360, Number(e.target.value) || 0)) })}
            className="h-9"
          />
        </div>

        {/* Rate */}
        <div className="space-y-1">
          <Label className="text-xs">ריבית שנתית (%)</Label>
          <Input
            type="number"
            min={0}
            max={20}
            step={0.05}
            value={track.annualRatePct}
            onChange={(e) => onChange({ annualRatePct: Number(e.target.value) || 0 })}
            className={`h-9 ${rateOutOfRange ? 'border-amber-400' : ''}`}
          />
        </div>
      </div>

      {meta.indexed && (
        <div className="grid sm:grid-cols-5 gap-2 items-end">
          <div className="space-y-1 sm:col-start-5">
            <Label className="text-xs flex items-center gap-1">
              מדד שנתי (%) <Info className="h-3 w-3 text-muted-foreground" />
            </Label>
            <Input
              type="number"
              min={-2}
              max={10}
              step={0.1}
              value={track.annualCpiPct ?? 2.5}
              onChange={(e) => onChange({ annualCpiPct: Number(e.target.value) || 0 })}
              className="h-9"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>
          ריבית מומלצת: <span dir="ltr">{meta.recommendedRange[0]}-{meta.recommendedRange[1]}%</span>
          {rateOutOfRange && <span className="text-amber-600"> · מחוץ לטווח</span>}
        </span>
        <span className="tabular-nums">
          החזר ראשון: <strong>{formatIls(summary.firstPayment)}</strong>
          {summary.peakPayment > summary.firstPayment * 1.02 && (
            <span className="text-muted-foreground"> → {formatIls(summary.peakPayment)}</span>
          )}
        </span>
      </div>
    </div>
  );
}

function MonthlyChart({ points }: { points: { month: number; payment: number }[] }) {
  // Render as a small SVG bar chart, one bar per year (max payment in year).
  // Avoids 300 micro-bars; a single year bar tells the story just as well.
  const byYear: { year: number; peak: number; first: number }[] = [];
  for (let y = 1; y <= Math.ceil(points.length / 12); y++) {
    const slice = points.slice((y - 1) * 12, y * 12);
    if (slice.length === 0) break;
    byYear.push({
      year: y,
      first: slice[0].payment,
      peak: Math.max(...slice.map((p) => p.payment)),
    });
  }
  const peak = byYear.reduce((m, r) => Math.max(m, r.peak), 1);
  const W = 720;
  const H = 160;
  const barW = byYear.length > 0 ? (W - 40) / byYear.length : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" /> תשלום חודשי לאורך השנים
        </CardTitle>
      </CardHeader>
      <CardContent>
        {byYear.length === 0 ? (
          <p className="text-sm text-muted-foreground">לא ניתן לחשב — סכומי המסלולים אפסיים.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
              {/* Horizontal gridlines at 25/50/75/100% of peak. */}
              {[0.25, 0.5, 0.75, 1].map((p, i) => (
                <line
                  key={i}
                  x1={20} x2={W - 20}
                  y1={H - 20 - (H - 40) * p}
                  y2={H - 20 - (H - 40) * p}
                  stroke="hsl(var(--border))" strokeDasharray="2,3"
                />
              ))}
              {byYear.map((r, i) => {
                const x = 20 + i * barW;
                const h = ((r.peak / peak) * (H - 40));
                return (
                  <g key={r.year}>
                    <rect
                      x={x + barW * 0.15}
                      y={H - 20 - h}
                      width={barW * 0.7}
                      height={h}
                      fill="url(#grad)"
                      rx={2}
                    >
                      <title>שנה {r.year}: שיא {formatIls(r.peak)}</title>
                    </rect>
                    {byYear.length <= 30 && i % Math.max(1, Math.ceil(byYear.length / 12)) === 0 && (
                      <text
                        x={x + barW / 2}
                        y={H - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill="hsl(var(--muted-foreground))"
                      >
                        {r.year}
                      </text>
                    )}
                  </g>
                );
              })}
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--grad-from))" />
                  <stop offset="100%" stopColor="hsl(var(--grad-to))" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnnualSchedule({ aggregate }: { aggregate: ReturnType<typeof aggregateMix> }) {
  const [open, setOpen] = useState(false);
  // Build year-by-year aggregate: sum of payments / interest / index per year,
  // and the remaining balance at year-end across all tracks.
  const years: { year: number; payments: number; interest: number; index: number; balance: number }[] = [];
  const maxMonths = aggregate.tracks.reduce((m, t) => Math.max(m, t.schedule.length), 0);
  for (let y = 1; y <= Math.ceil(maxMonths / 12); y++) {
    let payments = 0, interest = 0, index = 0, balance = 0;
    for (const t of aggregate.tracks) {
      const start = (y - 1) * 12;
      const end = Math.min(y * 12, t.schedule.length);
      for (let m = start; m < end; m++) {
        const r = t.schedule[m];
        payments += r.payment;
        interest += r.interest;
        index += r.indexAdjustment;
      }
      // Year-end balance is the balance at the last month of the year — or
      // 0 if the track already finished.
      const lastIdx = Math.min(end, t.schedule.length) - 1;
      balance += lastIdx >= 0 ? t.schedule[lastIdx].balance : 0;
    }
    years.push({ year: y, payments, interest, index, balance });
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-right"
      >
        <span className="font-semibold text-base">לוח סילוקין שנתי</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-2 font-medium">שנה</th>
                  <th className="text-right p-2 font-medium">תשלומים</th>
                  <th className="text-right p-2 font-medium">מתוכם ריבית</th>
                  <th className="text-right p-2 font-medium">הצמדה</th>
                  <th className="text-right p-2 font-medium">יתרת קרן</th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y.year} className="border-t">
                    <td className="p-2 tabular-nums">{y.year}</td>
                    <td className="p-2 tabular-nums">{formatIls(y.payments)}</td>
                    <td className="p-2 tabular-nums text-muted-foreground">{formatIls(y.interest)}</td>
                    <td className="p-2 tabular-nums text-muted-foreground">{formatIls(y.index)}</td>
                    <td className="p-2 tabular-nums font-medium">{formatIls(y.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ScenarioPill({
  active, onClick, icon: Icon, title, subtitle,
}: {
  active: boolean; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right rounded-lg border-2 p-3 transition-colors ${
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-primary" />
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function Metric({
  label, value, hint, warning, accent,
}: {
  label: string; value: string; hint?: string; warning?: boolean; accent?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${
        warning ? 'text-rose-600 dark:text-rose-400' : accent ? 'text-gradient' : ''
      }`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
