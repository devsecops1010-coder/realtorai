'use client';

// Israeli purchase-tax calculator.
//
// Two scenarios:
//   - "Single apartment" (דירה יחידה): progressive brackets, the first
//     ~₪1.98M is exempt for residents.
//   - "Investor" (משקיע): flat-ish two-tier rate, no exemption.
//
// Brackets are 2024-2025 published figures, automatically indexed each
// January. The tooltip / disclaimer makes clear the user must verify
// against רשות המסים for their exact purchase date.

import { useMemo, useState } from 'react';
import { Calculator, AlertTriangle, Home, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Scenario = 'single' | 'investor';

interface Bracket {
  upTo: number; // upper bound (inclusive), Infinity for last
  rate: number; // 0-1
}

// 2024-2025 brackets — מדרגות מס רכישה.
const SINGLE_APT: Bracket[] = [
  { upTo: 1_978_745, rate: 0 },
  { upTo: 2_347_040, rate: 0.035 },
  { upTo: 6_055_070, rate: 0.05 },
  { upTo: 20_183_565, rate: 0.08 },
  { upTo: Infinity, rate: 0.1 },
];

const INVESTOR: Bracket[] = [
  // The investor track has been 8% / 10% since 2022 with no exemption.
  { upTo: 6_055_070, rate: 0.08 },
  { upTo: Infinity, rate: 0.1 },
];

function calcTax(price: number, brackets: Bracket[]): { total: number; breakdown: { from: number; to: number; rate: number; tax: number }[] } {
  let remaining = price;
  let lower = 0;
  let total = 0;
  const breakdown: { from: number; to: number; rate: number; tax: number }[] = [];
  for (const b of brackets) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.upTo - lower);
    if (slice > 0) {
      const tax = slice * b.rate;
      total += tax;
      breakdown.push({ from: lower, to: lower + slice, rate: b.rate, tax });
    }
    remaining -= slice;
    lower = b.upTo;
  }
  return { total, breakdown };
}

function formatIls(n: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(n);
}

export function TaxCalculator() {
  const [scenario, setScenario] = useState<Scenario>('single');
  const [price, setPrice] = useState(2_500_000);

  const result = useMemo(() => {
    const clean = Math.max(0, Math.min(price, 100_000_000));
    const brackets = scenario === 'single' ? SINGLE_APT : INVESTOR;
    return calcTax(clean, brackets);
  }, [price, scenario]);

  const effectiveRate = price > 0 ? (result.total / price) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" /> נתוני העסקה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScenario('single')}
              className={`text-right rounded-lg border-2 p-3 transition-colors ${
                scenario === 'single'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Home className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">דירה יחידה</p>
              </div>
              <p className="text-xs text-muted-foreground">
                אין לך דירה אחרת בישראל (או שתמכור תוך 24 חודש).
              </p>
            </button>
            <button
              type="button"
              onClick={() => setScenario('investor')}
              className={`text-right rounded-lg border-2 p-3 transition-colors ${
                scenario === 'investor'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">משקיע</p>
              </div>
              <p className="text-xs text-muted-foreground">
                יש לך דירה נוספת — אין הטבת "דירה יחידה".
              </p>
            </button>
          </div>

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
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="text-base">מס רכישה משוער</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-1">סה"כ מס רכישה</p>
            <p className="text-4xl md:text-5xl font-bold bg-gradient-to-l from-primary to-fuchsia-500 bg-clip-text text-transparent">
              {formatIls(result.total)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              שיעור אפקטיבי: {effectiveRate.toFixed(2)}%
            </p>
          </div>

          {result.breakdown.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-right">מדרגה</th>
                    <th className="px-3 py-2 text-right">שיעור</th>
                    <th className="px-3 py-2 text-right">מס</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((b, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        {formatIls(b.from)} – {formatIls(b.to)}
                      </td>
                      <td className="px-3 py-2">{(b.rate * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 font-medium">{formatIls(b.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-amber-700 dark:text-amber-400">הסתייגות חוקית</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            המחשבון מספק הערכה כללית בלבד, על בסיס מדרגות 2024-2025 שמתעדכנות בינואר כל
            שנה. החישוב המדויק תלוי במעמד הרוכש (תושב, עולה חדש, נכה, רישום משותף וכו'),
            במועד הרכישה ובהטבות אישיות. לפני קבלת החלטה — היוועץ ביועץ מס או רואה
            חשבון.
          </p>
        </div>
      </div>
    </div>
  );
}
