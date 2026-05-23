'use client';

// Israeli mortgage calculator.
//
// Israeli mortgage rules (Bank of Israel, current as of 2025):
//   - Single-apartment buyer (דירה יחידה):    LTV ≤ 75%
//   - Replacement apartment (דירה חלופית):    LTV ≤ 70%
//   - Investor / additional apartment:         LTV ≤ 50%
//   - Term: usually capped at 30 years
//   - DTI: banks expect monthly repayment ≤ 30-40% of gross income;
//     35% is the conservative ceiling we use for the "income required"
//     calculation here.
//
// The PMT (monthly payment) is the standard annuity formula. We
// deliberately don't model a tamhil (mixed-track) loan — that's a v2.
// For v1, a single blended interest rate is enough to be useful and easy
// to reason about.

import { useMemo, useState } from 'react';
import { Banknote, AlertTriangle, Home, TrendingUp, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Scenario = 'single' | 'replacement' | 'investor';

const LTV_CAP: Record<Scenario, number> = {
  single: 0.75,
  replacement: 0.70,
  investor: 0.50,
};

const DTI_CEILING = 0.35; // 35% — conservative bank threshold for IL.

/**
 * Standard PMT (monthly annuity payment).
 *
 * P · r · (1+r)^n
 * ────────────────
 *   (1+r)^n − 1
 *
 * - principal: loan amount (₪)
 * - annualRate: percent (e.g. 4.5 means 4.5%)
 * - years: term in years
 *
 * Returns 0 for a 0-principal or 0-year loan (avoids NaN).
 * For a 0% rate we degenerate to principal / months (no interest).
 */
function monthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const months = years * 12;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

function formatIls(n: number, fractionDigits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(n);
}

export function MortgageCalculator() {
  const [scenario, setScenario] = useState<Scenario>('single');
  const [price, setPrice] = useState(2_500_000);
  const [downPayment, setDownPayment] = useState(625_000); // 25% default
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(4.5);

  const result = useMemo(() => {
    const cleanPrice = Math.max(0, Math.min(price, 100_000_000));
    const cleanDown = Math.max(0, Math.min(downPayment, cleanPrice));
    const principal = cleanPrice - cleanDown;
    const ltv = cleanPrice > 0 ? principal / cleanPrice : 0;
    const cap = LTV_CAP[scenario];

    const monthly = monthlyPayment(principal, rate, years);
    const totalPayments = monthly * years * 12;
    const totalInterest = totalPayments - principal;
    // Income needed so monthly payment ≤ DTI_CEILING of gross income.
    const requiredMonthlyIncome = monthly / DTI_CEILING;

    return {
      principal,
      ltv,
      cap,
      withinCap: ltv <= cap + 1e-9, // tolerate fp dust
      monthly,
      totalPayments,
      totalInterest,
      requiredMonthlyIncome,
      requiredDown: cleanPrice * (1 - cap),
      excessDown: cleanPrice * (1 - cap) - cleanDown,
    };
  }, [scenario, price, downPayment, years, rate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-primary" /> נתוני העסקה והמשכנתא
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-2">
            <ScenarioPill
              active={scenario === 'single'}
              onClick={() => setScenario('single')}
              icon={Home}
              title="דירה יחידה"
              subtitle="עד 75% מהשווי"
            />
            <ScenarioPill
              active={scenario === 'replacement'}
              onClick={() => setScenario('replacement')}
              icon={TrendingUp}
              title="דירה חלופית"
              subtitle="עד 70% מהשווי"
            />
            <ScenarioPill
              active={scenario === 'investor'}
              onClick={() => setScenario('investor')}
              icon={Coins}
              title="משקיע"
              subtitle="עד 50% מהשווי"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">מחיר הדירה (₪)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                max={100_000_000}
                step={50_000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="down">הון עצמי (₪)</Label>
              <Input
                id="down"
                type="number"
                min={0}
                max={price}
                step={10_000}
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="years">תקופת ההלוואה (שנים)</Label>
              <Input
                id="years"
                type="number"
                min={1}
                max={30}
                step={1}
                value={years}
                onChange={(e) => setYears(Math.max(1, Math.min(30, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">ריבית שנתית ממוצעת (%)</Label>
              <Input
                id="rate"
                type="number"
                min={0}
                max={20}
                step={0.05}
                value={rate}
                onChange={(e) => setRate(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="text-base">תוצאות החישוב</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-1">תשלום חודשי משוער</p>
            <p className="text-4xl md:text-5xl font-bold bg-gradient-to-l from-primary to-fuchsia-500 bg-clip-text text-transparent">
              {formatIls(result.monthly)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              נדרשת הכנסה חודשית של כ-{formatIls(result.requiredMonthlyIncome)} (35% החזר מתוך הכנסה)
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Metric label="סכום ההלוואה" value={formatIls(result.principal)} />
            <Metric
              label={`יחס הלוואה לשווי (LTV)`}
              value={`${(result.ltv * 100).toFixed(1)}%`}
              hint={`מקסימום: ${(result.cap * 100).toFixed(0)}%`}
              warning={!result.withinCap}
            />
            <Metric label="סך ריבית שתשולם" value={formatIls(result.totalInterest)} />
          </div>

          {!result.withinCap && (
            <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-rose-700 dark:text-rose-400 mb-1">
                  ההון העצמי נמוך מהמותר
                </p>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80">
                  בקטגוריה זו הבנק לא יאשר LTV מעל {(result.cap * 100).toFixed(0)}%. צריך הון
                  עצמי של לפחות <strong>{formatIls(result.requiredDown)}</strong> — חוסר של{' '}
                  <strong>{formatIls(Math.max(0, result.excessDown))}</strong>.
                </p>
              </div>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-1">
              פירוט תשלום מצטבר
            </summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <Metric label="סך התשלומים לאורך התקופה" value={formatIls(result.totalPayments)} />
              <Metric label="מספר חודשים" value={`${years * 12}`} />
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-amber-700 dark:text-amber-400">הסתייגות</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            המחשבון מספק הערכה כללית של החזר חודשי בריבית קבועה. משכנתאות בישראל נבנות
            בפועל כתמהיל של מסלולים (פריים, צמודה, קל"צ, וכו'), עם ריביות שונות וצמוד
            למדד. הריבית בפועל תלויה בבנק, בהכנסת הלווים, ב-LTV ובמסלולים שייבחרו. לפני
            קבלת החלטה — היוועץ ביועץ משכנתאות מורשה.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScenarioPill({
  active,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
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
  label,
  value,
  hint,
  warning,
}: {
  label: string;
  value: string;
  hint?: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-lg font-bold ${
          warning ? 'text-rose-600 dark:text-rose-400' : ''
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
