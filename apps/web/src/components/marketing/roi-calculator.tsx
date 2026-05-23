'use client';

// ROI calculator. Lets a prospect plug in their current funnel numbers and
// see the estimated *extra* commission Realtorai is projected to generate
// per month. Numbers are conservative (we use a 25% lift on close rate
// from current industry benchmarks for AI-assisted CRM) — the goal is to
// be defensible if the prospect closes and later compares.
//
// Self-contained — no API call, no auth required. Lives on /pricing.

import { useMemo, useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// 25% relative lift on close rate (industry-reported median for AI-augmented
// SDR / CRM). Conservative — published case studies show 30-50%.
const CLOSE_RATE_LIFT = 0.25;

// Response-time lift: AI replies within 5min, humans average ~30min. The
// industry-standard 5x lead-to-meeting rate for sub-5-min response is a
// well-cited number (HBR, 2011 — still holds). We blend it into a 10%
// extra "lead-to-handoff" rate boost.
const RESPONSE_LIFT = 0.10;

function formatIls(n: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function RoiCalculator() {
  const [leadsPerMonth, setLeadsPerMonth] = useState(80);
  const [currentClosePct, setCurrentClosePct] = useState(3);
  const [avgCommissionIls, setAvgCommissionIls] = useState(18_000);

  const result = useMemo(() => {
    // Sanity-clamp inputs so a stray negative or absurd value doesn't blow
    // out the display. We bracket at realistic upper bounds for IL agencies.
    const leads = Math.max(0, Math.min(leadsPerMonth, 5_000));
    const closeRate = Math.max(0, Math.min(currentClosePct, 100)) / 100;
    const commission = Math.max(0, Math.min(avgCommissionIls, 1_000_000));

    const currentRevenue = leads * closeRate * commission;
    // New close rate = old * (1 + lift). Then add a small response-time
    // bonus on top. Reasonable approximation; not stacked geometrically.
    const newCloseRate = Math.min(0.5, closeRate * (1 + CLOSE_RATE_LIFT) + RESPONSE_LIFT * closeRate);
    const newRevenue = leads * newCloseRate * commission;
    const monthlyDelta = newRevenue - currentRevenue;

    return {
      currentRevenue,
      newRevenue,
      monthlyDelta,
      annualDelta: monthlyDelta * 12,
      newCloseRatePct: newCloseRate * 100,
    };
  }, [leadsPerMonth, currentClosePct, avgCommissionIls]);

  return (
    <section className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
          <Calculator className="h-4 w-4" />
          מחשבון ROI
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          כמה הכנסה נוספת המערכת מייצרת לך?
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          הזן את הנתונים שלך כיום וקבל הערכה שמרנית של ההכנסה הנוספת — מבוססת על שיעורי
          שיפור מקובלים ב-CRM מבוסס AI (25% עליה בשיעור סגירה + 10% תוספת ממענה
          תוך 5 דקות).
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">המספרים שלך</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="leads">לידים בחודש</Label>
              <Input
                id="leads"
                type="number"
                min={0}
                max={5000}
                value={leadsPerMonth}
                onChange={(e) => setLeadsPerMonth(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="close">שיעור סגירה נוכחי (%)</Label>
              <Input
                id="close"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={currentClosePct}
                onChange={(e) => setCurrentClosePct(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comm">עמלה ממוצעת לעסקה (₪)</Label>
              <Input
                id="comm"
                type="number"
                min={0}
                step={500}
                value={avgCommissionIls}
                onChange={(e) => setAvgCommissionIls(Number(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              הערכת ROI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="הכנסה חודשית כיום" value={formatIls(result.currentRevenue)} />
              <Metric
                label="הכנסה חודשית עם Realtorai"
                value={formatIls(result.newRevenue)}
                accent
              />
            </div>
            <hr />
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-1">הפרש שנתי משוער</p>
              <p className="text-4xl md:text-5xl font-bold bg-gradient-to-l from-primary to-fuchsia-500 bg-clip-text text-transparent">
                {formatIls(result.annualDelta)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                שיעור סגירה צפוי: {result.newCloseRatePct.toFixed(1)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center italic">
              * הערכה שמרנית בלבד. הביצועים בפועל תלויים במאפייני הליד, איכות צוות
              ומחירי שוק. לא מבטיחים תוצאה.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {value}
      </p>
    </div>
  );
}
