'use client';

/**
 * Compact in-page mortgage calculator for the property detail view.
 *
 * Why a separate component instead of `<MortgageCalculator compact>`:
 * the full multi-mix calculator at /tools/mortgage-calculator is 1.4k
 * lines of UI built around horizontal grids (≥1180 px wide). Embedding
 * it inside the property page's ~770 px main column forces horizontal
 * scroll and stretches the layout — exactly what the user reported.
 *
 * This compact view shares the *same math engine* (`/lib/mortgage.ts`)
 * so the numbers match the full calculator. It just shows the headline:
 *   - 2 sliders (down-payment %, term years)
 *   - Loan amount + LTV
 *   - Monthly payment (first month) + required income
 *   - Tiny breakdown of the 3 default tracks
 *   - "פתח מחשבון תמהיל מלא →" CTA for users who want the deep view
 *
 * Stays under 700 px wide. No horizontal scroll. No tabs.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calculator, ArrowLeft } from 'lucide-react';
import { aggregateMix, defaultMix, TRACKS } from '@/lib/mortgage';

function formatIls(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function PropertyMortgageCalc({ price }: { price: number }) {
  // Down-payment as a percentage of price. 25% is the smallest LTV that
  // satisfies the "single apartment" Bank of Israel cap (75%).
  const [downPct, setDownPct] = useState(25);
  const [years, setYears] = useState(25);

  const downPayment = Math.round((price * downPct) / 100);
  const loan = Math.max(0, price - downPayment);
  const ltv = price > 0 ? (loan / price) * 100 : 0;

  // Reuse the mortgage engine: 3-track default mix at the chosen term.
  // Same numbers the full calculator would show on first open.
  const aggregate = useMemo(() => {
    const tracks = defaultMix(loan, years * 12);
    return aggregateMix(tracks);
  }, [loan, years]);

  // ~35% DTI ceiling — same as the full calculator's "required income" line.
  const requiredIncome = aggregate.firstMonthlyPayment / 0.35;
  // Per-track first-month breakdown for the tiny "mix" pills.
  const tracks = aggregate.tracks.map((t) => ({
    short: TRACKS[t.kind].short,
    firstPayment: t.firstPayment,
  }));

  // LTV >75% means the buyer can't get this loan in the "דירה יחידה"
  // bucket. The full calc has a richer warning; here we just dim the
  // monthly figure so the user sees the issue at a glance.
  const ltvWarning = ltv > 75.5;

  return (
    <div className="space-y-4">
      {/* Inputs ─────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SliderRow
          label="הון עצמי"
          value={downPct}
          min={10}
          max={50}
          step={1}
          unit="%"
          rightHint={formatIls(downPayment)}
          onChange={setDownPct}
        />
        <SliderRow
          label="תקופה"
          value={years}
          min={10}
          max={30}
          step={1}
          unit="שנים"
          rightHint={`${years * 12} חודשים`}
          onChange={setYears}
        />
      </div>

      {/* Summary card ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="סכום ההלוואה" value={formatIls(loan)} />
          <Stat
            label="יחס LTV"
            value={`${ltv.toFixed(1)}%`}
            hint={ltvWarning ? 'מעל מקסימום דירה יחידה (75%)' : 'בתוך מקסימום דירה יחידה'}
            warning={ltvWarning}
          />
        </div>

        <div className="rounded-lg bg-gradient-to-br from-primary/10 via-transparent to-fuchsia-500/10 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">תשלום חודשי ראשון (תמהיל ⅓-⅓-⅓)</p>
          <p className="text-3xl font-bold text-gradient">
            {formatIls(aggregate.firstMonthlyPayment)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            הכנסה נדרשת: <strong>{formatIls(requiredIncome)}</strong> (35% החזר)
          </p>
        </div>

        {/* Per-track first-month chips. Lets the user see the mix without
            opening the full calculator. */}
        <div className="grid grid-cols-3 gap-2">
          {tracks.map((t) => (
            <div key={t.short} className="rounded-md border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{t.short}</p>
              <p className="text-sm font-semibold tabular-nums">{formatIls(t.firstPayment)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-3">
          <span>
            סך החזר: <strong className="text-foreground">{formatIls(aggregate.totalRepayment)}</strong>
          </span>
          <span>
            סך ריבית: <strong className="text-foreground">{formatIls(aggregate.totalInterest)}</strong>
          </span>
        </div>
      </div>

      {/* CTA → full calculator ─────────────────────────────────────── */}
      <Link
        href={`/tools/mortgage-calculator?price=${price}&down=${downPayment}`}
        className="flex items-center justify-between rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-sm hover:bg-primary/10 transition-colors group"
      >
        <span className="flex items-center gap-2 font-medium">
          <Calculator className="h-4 w-4 text-primary" />
          פתח מחשבון תמהיל מלא — השוואה, גרייס, סילוק מוקדם, ועוד
        </span>
        <ArrowLeft className="h-4 w-4 text-primary group-hover:-translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, unit, rightHint, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  rightHint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums font-bold">
          {value} <span className="text-xs text-muted-foreground font-normal">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        // Tailwind doesn't have a default range-slider style; this is the
        // shadcn-friendly minimum that picks up the primary colour. RTL
        // is fine — the user reads min→max right-to-left naturally.
        className="w-full accent-[hsl(var(--primary))]"
      />
      {rightHint && <p className="text-xs text-muted-foreground text-left tabular-nums">{rightHint}</p>}
    </div>
  );
}

function Stat({
  label, value, hint, warning,
}: { label: string; value: string; hint?: string; warning?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${warning ? 'text-rose-600 dark:text-rose-400' : ''}`}>
        {value}
      </p>
      {hint && <p className={`text-[10px] mt-0.5 ${warning ? 'text-rose-600/80' : 'text-muted-foreground'}`}>{hint}</p>}
    </div>
  );
}
