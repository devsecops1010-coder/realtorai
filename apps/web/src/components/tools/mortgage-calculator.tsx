'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Home,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Scale,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRACKS,
  TRACK_OPTIONS,
  aggregateMix,
  defaultMix,
  summarizeTrack,
  validateMix,
  type MixAggregate,
  type PrepaymentMode,
  type PrepaymentType,
  type RepayMethod,
  type TrackInput,
  type TrackKind,
} from '@/lib/mortgage';

type Scenario = 'single' | 'replacement' | 'investor';
type CompareMode = 'summary' | 'annual' | 'monthly';

interface MixState {
  id: string;
  name: string;
  tracks: TrackInput[];
}

const MAX_MIXES = 4;
const MAX_TRACKS = 8;
const STORAGE_KEY = 'realtorai_full_mortgage_calculator';
const LTV_CAP: Record<Scenario, number> = { single: 0.75, replacement: 0.7, investor: 0.5 };
const TERM_MONTH_OPTIONS = Array.from({ length: 30 }, (_, index) => (index + 1) * 12);

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatIls(value: number, fractionDigits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function formatNumber(value: number, fractionDigits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('he-IL', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function withFreshIds(tracks: TrackInput[]) {
  return tracks.map((track, index) => ({ ...track, id: uid(`t${index + 1}`) }));
}

function roundToThousand(value: number) {
  return Math.round(value / 1000) * 1000;
}

function scaleTrackPrincipals(tracks: TrackInput[], nextTotalLoan: number): TrackInput[] {
  const safeTotal = Math.max(0, Math.round(nextTotalLoan));
  if (tracks.length === 0) return withFreshIds(defaultMix(safeTotal));

  const currentTotal = tracks.reduce((sum, track) => sum + Math.max(0, track.principal || 0), 0);
  let allocated = 0;

  return tracks.map((track, index) => {
    const isLast = index === tracks.length - 1;
    let principal: number;

    if (isLast) {
      principal = Math.max(0, safeTotal - allocated);
    } else if (currentTotal > 0) {
      principal = Math.min(
        roundToThousand((safeTotal * Math.max(0, track.principal || 0)) / currentTotal),
        Math.max(0, safeTotal - allocated),
      );
    } else {
      principal = Math.min(roundToThousand(safeTotal / tracks.length), Math.max(0, safeTotal - allocated));
    }

    allocated += principal;
    return { ...track, principal };
  });
}

function createMix(name: string, totalLoan: number): MixState {
  return { id: uid('mix'), name, tracks: withFreshIds(defaultMix(totalLoan)) };
}

function createDefaultMixes(totalLoan: number): MixState[] {
  return Array.from({ length: MAX_MIXES }, (_, index) => createMix(`תמהיל ${index + 1}`, totalLoan));
}

export function MortgageCalculator() {
  const [scenario, setScenario] = useState<Scenario>('single');
  const [price, setPrice] = useState(2_500_000);
  const [downPayment, setDownPayment] = useState(625_000);
  const totalLoan = Math.max(0, price - downPayment);
  const ltv = price > 0 ? totalLoan / price : 0;
  const ltvCap = LTV_CAP[scenario];
  const withinLtv = ltv <= ltvCap + 1e-9;

  const [mixes, setMixes] = useState<MixState[]>(() => createDefaultMixes(totalLoan));
  const [activeMixId, setActiveMixId] = useState(() => mixes[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<'compare' | string>(() => mixes[0]?.id ?? '');
  const [compareMode, setCompareMode] = useState<CompareMode>('summary');
  const [savedState, setSavedState] = useState<'idle' | 'saved' | 'loaded'>('idle');

  const activeMix = mixes.find((mix) => mix.id === activeMixId) ?? mixes[0];
  const comparisonActive = activeTab === 'compare';
  const aggregates = useMemo(
    () => mixes.map((mix) => ({ mix, aggregate: aggregateMix(mix.tracks), validation: validateMix(mix.tracks, totalLoan) })),
    [mixes, totalLoan],
  );
  const activeAggregate = aggregates.find((item) => item.mix.id === activeMix?.id)?.aggregate ?? aggregateMix([]);
  const activeValidation = aggregates.find((item) => item.mix.id === activeMix?.id)?.validation ?? validateMix([], totalLoan);

  function handlePriceChange(value: number) {
    const nextPrice = Math.max(0, value);
    const nextDownPayment = Math.min(downPayment, nextPrice);
    setPrice(nextPrice);
    setDownPayment(nextDownPayment);
    syncTrackAmounts(Math.max(0, nextPrice - nextDownPayment));
  }

  function handleDownPaymentChange(value: number) {
    const nextDownPayment = Math.min(Math.max(0, value), price);
    setDownPayment(nextDownPayment);
    syncTrackAmounts(Math.max(0, price - nextDownPayment));
  }

  function handleLoanAmountChange(value: number) {
    const nextLoan = Math.min(Math.max(0, value), price);
    setDownPayment(Math.max(0, price - nextLoan));
    syncTrackAmounts(nextLoan);
  }

  function handleLtvChange(value: number) {
    const nextLtv = Math.min(Math.max(0, value), 100) / 100;
    const nextLoan = Math.round(price * nextLtv);
    setDownPayment(Math.max(0, price - nextLoan));
    syncTrackAmounts(nextLoan);
  }

  function updateActiveMix(patch: Partial<MixState>) {
    if (!activeMix) return;
    setMixes((prev) => prev.map((mix) => (mix.id === activeMix.id ? { ...mix, ...patch } : mix)));
  }

  function syncTrackAmounts(nextTotalLoan: number) {
    setMixes((prev) => prev.map((mix) => ({ ...mix, tracks: scaleTrackPrincipals(mix.tracks, nextTotalLoan) })));
  }

  function updateTrack(trackId: string, patch: Partial<TrackInput>) {
    if (!activeMix) return;
    setMixes((prev) =>
      prev.map((mix) =>
        mix.id === activeMix.id
          ? { ...mix, tracks: mix.tracks.map((track) => (track.id === trackId ? { ...track, ...patch } : track)) }
          : mix,
      ),
    );
  }

  function addTrack() {
    if (!activeMix || activeMix.tracks.length >= MAX_TRACKS) return;
    const nextTrack: TrackInput = {
      id: uid('track'),
      kind: 'var5_linked',
      method: 'shpitzer',
      principal: 0,
      annualRatePct: TRACKS.var5_linked.defaultRatePct,
      months: activeMix.tracks[0]?.months ?? 360,
      annualCpiPct: 2.5,
      prepaymentType: 'none',
      prepaymentMode: 'reduce_payment',
    };
    updateActiveMix({ tracks: [...activeMix.tracks, nextTrack] });
  }

  function removeTrack(trackId: string) {
    if (!activeMix || activeMix.tracks.length <= 1) return;
    updateActiveMix({ tracks: activeMix.tracks.filter((track) => track.id !== trackId) });
  }

  function rebalanceActiveMix() {
    if (!activeMix) return;
    const months = activeMix.tracks[0]?.months ?? 360;
    updateActiveMix({ tracks: withFreshIds(defaultMix(totalLoan, months)) });
  }

  function addMixFromActive() {
    if (!activeMix) return;
    const index = Math.max(0, mixes.findIndex((mix) => mix.id === activeMix.id));
    const target = mixes[(index + 1) % mixes.length];
    if (!target) return;
    setMixes((prev) =>
      prev.map((mix) => (mix.id === target.id ? { ...mix, tracks: withFreshIds(activeMix.tracks) } : mix)),
    );
    setActiveMixId(target.id);
    setActiveTab(target.id);
  }

  function saveToBrowser() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenario, price, downPayment, mixes, activeMixId }));
    setSavedState('saved');
  }

  function loadFromBrowser() {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        scenario?: Scenario;
        price?: number;
        downPayment?: number;
        mixes?: MixState[];
        activeMixId?: string;
      };
      if (parsed.scenario) setScenario(parsed.scenario);
      if (typeof parsed.price === 'number') setPrice(parsed.price);
      if (typeof parsed.downPayment === 'number') setDownPayment(parsed.downPayment);
      if (Array.isArray(parsed.mixes) && parsed.mixes.length > 0) setMixes(parsed.mixes.slice(0, MAX_MIXES));
      if (parsed.activeMixId) {
        setActiveMixId(parsed.activeMixId);
        setActiveTab(parsed.activeMixId);
      }
      setSavedState('loaded');
    } catch {
      setSavedState('idle');
    }
  }

  function exportCsv() {
    if (!activeMix) return;
    const rows = buildMonthlyRows(activeAggregate).map((row) => [
      row.month,
      Math.round(row.payment),
      Math.round(row.principal),
      Math.round(row.interest),
      Math.round(row.index),
      Math.round(row.extra),
      Math.round(row.balance),
    ]);
    const csv = [
      ['month', 'payment', 'principal', 'interest', 'index', 'prepayment', 'balance'],
      ...rows,
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeMix.name.replace(/\s+/g, '-')}-schedule.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-0" dir="rtl">
      <CalculatorTabs
        mixes={mixes}
        activeTab={activeTab}
        onCompare={() => setActiveTab('compare')}
        onSelect={(id) => {
          setActiveMixId(id);
          setActiveTab(id);
        }}
      />

      {comparisonActive ? (
        <Card className="overflow-hidden rounded-t-none border-slate-400">
          <CardHeader className="bg-slate-700 text-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4" />
                השוואת תמהילים
              </CardTitle>
              <CompareModeSwitch value={compareMode} onChange={setCompareMode} />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <MixComparison items={aggregates} mode={compareMode} />
          </CardContent>
        </Card>
      ) : activeMix && (
        <div className="space-y-5">
          <section className="rounded-b-lg border border-[#8eb4da] bg-[#bfd8f0] p-3 shadow-soft">
            <div className="mb-3 grid gap-3 xl:grid-cols-[1fr_360px]">
              <div className="rounded-md border border-white/70 bg-[#dceafa] p-3">
                <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
                  <div className="grid gap-1">
                    <Label htmlFor="mix-name" className="text-xs text-[#4f77a1]">שם התמהיל</Label>
                    <Input
                      id="mix-name"
                      value={activeMix.name}
                      onChange={(event) => updateActiveMix({ name: event.target.value })}
                      className="h-9 border-white bg-white"
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <ScenarioPill active={scenario === 'single'} title="דירה יחידה" subtitle="75%" onClick={() => setScenario('single')} />
                    <ScenarioPill active={scenario === 'replacement'} title="דירה חלופית" subtitle="70%" onClick={() => setScenario('replacement')} />
                    <ScenarioPill active={scenario === 'investor'} title="משקיע" subtitle="50%" onClick={() => setScenario('investor')} />
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <WorkbenchNumber label="מחיר הדירה" value={price} onChange={handlePriceChange} step={50_000} />
                  <WorkbenchNumber label="הון עצמי" value={downPayment} onChange={handleDownPaymentChange} step={10_000} />
                  <DarkEditableCell label="סכום ההלוואה" value={totalLoan} onChange={handleLoanAmountChange} step={10_000} suffix="₪" />
                  <DarkEditableCell label="אחוז מימון" value={Number((ltv * 100).toFixed(1))} onChange={handleLtvChange} step={0.1} suffix="%" warning={!withinLtv} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <DarkSummaryCell label="החזר חודשי" value={formatIls(activeAggregate.firstMonthlyPayment)} large />
                <DarkSummaryCell label="החזר כולל" value={formatIls(activeAggregate.totalRepayment)} large />
                <DarkSummaryCell label="החזר מקסימלי" value={formatIls(activeAggregate.peakMonthlyPayment)} />
                <DarkSummaryCell label="ריבית + מדד" value={formatIls(activeAggregate.totalInterest + activeAggregate.totalIndex)} />
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={rebalanceActiveMix}>
                <RotateCcw className="h-4 w-4" />
                איפוס תמהיל
              </Button>
              <Button type="button" variant="outline" onClick={addMixFromActive}>
                <Copy className="h-4 w-4" />
                שכפל לתמהיל הבא
              </Button>
              <Button type="button" variant="outline" onClick={saveToBrowser}>
                <Save className="h-4 w-4" />
                {savedState === 'saved' ? 'נשמר' : 'שמור'}
              </Button>
              <Button type="button" variant="outline" onClick={loadFromBrowser}>טען שמור</Button>
              <Button type="button" variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button type="button" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                הדפס
              </Button>
            </div>

            {(!withinLtv || activeValidation.messages.length > 0) && (
              <div className="mb-3">
                {!withinLtv && (
                  <Notice tone="danger">
                    ההון העצמי נמוך מהמותר לסוג העסקה. נדרש לפחות {formatIls(price * (1 - ltvCap))}.
                  </Notice>
                )}
                {activeValidation.messages.length > 0 && (
                  <Notice tone="warning">
                    {activeValidation.messages.map((message) => (
                      <span key={message} className="block">{message}</span>
                    ))}
                  </Notice>
                )}
              </div>
            )}

            <TrackMatrix
              tracks={activeMix.tracks}
              onChange={updateTrack}
              onRemove={removeTrack}
              onAdd={addTrack}
              canAdd={activeMix.tracks.length < MAX_TRACKS}
            />
          </section>

          <div className="space-y-4">
            <ResultsTable tracks={activeMix.tracks} aggregate={activeAggregate} />
            <PaymentChart aggregates={aggregates} activeMixId={activeMix.id} />
            <MonthlySchedule aggregate={activeAggregate} mixName={activeMix.name} />
          </div>
        </div>
      )}

      <Notice tone="plain">
        המחשבון הוא כלי הערכה בלבד. בנק, יועץ משכנתאות ושמאי יכולים לשנות ריביות, מסלולים ואישור בפועל.
        עמלת פירעון מוקדם וביטוח משכנתא אינם מחושבים כאן.
      </Notice>
    </div>
  );
}

function CalculatorTabs({
  mixes,
  activeTab,
  onCompare,
  onSelect,
}: {
  mixes: MixState[];
  activeTab: 'compare' | string;
  onCompare: () => void;
  onSelect: (id: string) => void;
}) {
  const colors = [
    'bg-[#9bbfe3] text-slate-800 border-[#82acd8]',
    'bg-[#f2a3bb] text-white border-[#e88aa8]',
    'bg-[#f6d66f] text-white border-[#edc857]',
    'bg-[#98d9b0] text-white border-[#7bc99a]',
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[720px] items-end gap-1" dir="rtl">
        {mixes.map((mix, index) => {
          const active = activeTab === mix.id;
          return (
            <button
              key={mix.id}
              type="button"
              onClick={() => onSelect(mix.id)}
              className={[
                'h-11 min-w-36 rounded-t-md border px-5 text-lg font-bold shadow-sm transition',
                colors[index] ?? colors[0],
                active ? 'translate-y-0 opacity-100 ring-2 ring-white' : 'translate-y-1 opacity-80 hover:translate-y-0 hover:opacity-100',
              ].join(' ')}
            >
              {mix.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCompare}
          className={[
            'h-11 min-w-44 rounded-t-md border border-slate-700 bg-slate-700 px-5 text-lg font-bold text-white shadow-sm transition',
            activeTab === 'compare' ? 'translate-y-0 ring-2 ring-white' : 'translate-y-1 opacity-90 hover:translate-y-0 hover:opacity-100',
          ].join(' ')}
        >
          השוואת תמהילים
        </button>
      </div>
    </div>
  );
}

function CompareModeSwitch({ value, onChange }: { value: CompareMode; onChange: (value: CompareMode) => void }) {
  const options: { value: CompareMode; label: string }[] = [
    { value: 'summary', label: 'סיכום' },
    { value: 'annual', label: 'שנתי' },
    { value: 'monthly', label: 'חודשי' },
  ];

  return (
    <div className="grid grid-cols-3 rounded-md border border-white/30 bg-white/10 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            value === option.value
              ? 'rounded-sm bg-white px-3 py-1.5 text-sm font-medium text-slate-800'
              : 'rounded-sm px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white'
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TrackMatrix({
  tracks,
  onChange,
  onRemove,
  onAdd,
  canAdd,
}: {
  tracks: TrackInput[];
  onChange: (trackId: string, patch: Partial<TrackInput>) => void;
  onRemove: (trackId: string) => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  const [advancedId, setAdvancedId] = useState<string | null>(null);
  const gridClass = 'grid min-w-[1180px] grid-cols-[130px_190px_145px_130px_105px_105px_78px_120px_120px_46px] gap-2';

  function changeKind(track: TrackInput, kind: TrackKind) {
    const meta = TRACKS[kind];
    onChange(track.id, {
      kind,
      annualRatePct: meta.defaultRatePct,
      annualCpiPct: meta.indexed ? (track.annualCpiPct ?? 2.5) : undefined,
    });
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#8eb4da] bg-[#bdd6ef] p-1" dir="rtl">
      <div className={`${gridClass} rounded-t-sm bg-[#9bbfe3] px-2 py-2 text-center text-sm font-bold text-white`}>
        <div>סכום</div>
        <div>מסלול</div>
        <div>שיטת החזר</div>
        <div>תקופה בחודשים</div>
        <div>ריבית</div>
        <div>מדד</div>
        <div>מתקדם</div>
        <div>החזר חודשי</div>
        <div>החזר כולל</div>
        <div />
      </div>

      <div className="space-y-1 p-2">
        {tracks.map((track, index) => {
          const meta = TRACKS[track.kind];
          const summary = summarizeTrack(track);
          const advancedOpen = advancedId === track.id;
          return (
            <div key={track.id} className="space-y-1">
              <div className={`${gridClass} items-center`}>
                <TableNumber value={track.principal} onChange={(value) => onChange(track.id, { principal: value })} step={10_000} placeholder="הזן סכום" />
                <TableSelect value={track.kind} onChange={(value) => changeKind(track, value as TrackKind)}>
                  {TRACK_OPTIONS.map((option) => (
                    <option key={option.kind} value={option.kind}>{option.labelHe}</option>
                  ))}
                </TableSelect>
                <TableSelect value={track.method} onChange={(value) => onChange(track.id, { method: value as RepayMethod })}>
                  <option value="shpitzer">שפיצר</option>
                  <option value="equal_principal">קרן שווה</option>
                  <option value="bullet">בוליט</option>
                </TableSelect>
                <TableTermSelect value={track.months} onChange={(value) => onChange(track.id, { months: value })} />
                <TableNumber value={track.annualRatePct} onChange={(value) => onChange(track.id, { annualRatePct: value })} step={0.05} />
                <TableNumber
                  value={meta.indexed ? (track.annualCpiPct ?? 2.5) : 0}
                  onChange={(value) => onChange(track.id, { annualCpiPct: value })}
                  step={0.1}
                  disabled={!meta.indexed}
                  placeholder={meta.indexed ? undefined : '---'}
                />
                <button
                  type="button"
                  onClick={() => setAdvancedId(advancedOpen ? null : track.id)}
                  className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-white text-lg font-bold text-[#6d98c4] shadow-sm"
                  aria-label={`מתקדם מסלול ${index + 1}`}
                >
                  +
                </button>
                <ResultCell value={formatIls(summary.firstPayment)} />
                <ResultCell value={formatIls(summary.totalPayments)} />
                <button
                  type="button"
                  onClick={() => onRemove(track.id)}
                  disabled={tracks.length <= 1}
                  className="grid h-9 w-9 place-items-center rounded-md bg-white/80 text-slate-500 disabled:opacity-35"
                  aria-label="מחק מסלול"
                >
                  ×
                </button>
              </div>
              {advancedOpen && (
                <div className="min-w-[1180px] rounded-md border border-white/70 bg-[#d9eafb] p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <AdvancedBlock title="גרייס">
                      <NumberField
                        label="חודשי גרייס"
                        value={track.graceMonths ?? 0}
                        onChange={(value) => onChange(track.id, { graceMonths: Math.max(0, Math.min(60, value)) })}
                        step={1}
                        compact
                      />
                    </AdvancedBlock>
                    <AdvancedBlock title="שינוי ריבית עתידי">
                      <NumberField
                        label="חודש שינוי"
                        value={track.futureRateMonth ?? 0}
                        onChange={(value) => onChange(track.id, { futureRateMonth: Math.max(0, value) })}
                        step={1}
                        compact
                      />
                      <NumberField
                        label="שינוי בריבית %"
                        value={track.futureRateDeltaPct ?? 0}
                        onChange={(value) => onChange(track.id, { futureRateDeltaPct: value })}
                        step={0.1}
                        compact
                      />
                    </AdvancedBlock>
                    <AdvancedBlock title="סילוק עתידי">
                      <SelectField
                        label="סוג סילוק"
                        value={track.prepaymentType ?? 'none'}
                        onChange={(value) => onChange(track.id, { prepaymentType: value as PrepaymentType })}
                      >
                        <option value="none">ללא</option>
                        <option value="partial">חלקי</option>
                        <option value="full">מלא</option>
                      </SelectField>
                      <NumberField
                        label="חודש סילוק"
                        value={track.prepaymentMonth ?? 0}
                        onChange={(value) => onChange(track.id, { prepaymentMonth: Math.max(0, value) })}
                        step={1}
                        compact
                      />
                      {(track.prepaymentType ?? 'none') === 'partial' && (
                        <NumberField
                          label="סכום לסילוק"
                          value={track.prepaymentAmount ?? 0}
                          onChange={(value) => onChange(track.id, { prepaymentAmount: Math.max(0, value) })}
                          step={10_000}
                          compact
                        />
                      )}
                      {(track.prepaymentType ?? 'none') === 'partial' && (
                        <SelectField
                          label="אחרי סילוק"
                          value={track.prepaymentMode ?? 'reduce_payment'}
                          onChange={(value) => onChange(track.id, { prepaymentMode: value as PrepaymentMode })}
                        >
                          <option value="reduce_payment">הורדת החזר</option>
                          <option value="shorten_term">קיצור תקופה</option>
                        </SelectField>
                      )}
                    </AdvancedBlock>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="mx-auto mb-2 flex min-w-[520px] items-center justify-center rounded-full border border-white bg-[#a9caea] px-4 py-2 text-sm font-semibold text-white shadow-inner disabled:opacity-50"
      >
        לחץ כאן להוספת מסלול
      </button>
    </div>
  );
}

function TableNumber({
  value,
  onChange,
  step,
  disabled,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  step: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={disabled ? '' : Number.isFinite(value) ? value : 0}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className="h-9 w-full rounded-sm border border-white bg-white px-2 text-left text-sm text-slate-800 shadow-inner disabled:bg-slate-100 disabled:text-slate-400"
      dir="ltr"
    />
  );
}

function TableSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-sm border border-white bg-white px-2 text-sm text-slate-800 shadow-inner"
    >
      {children}
    </select>
  );
}

function TableTermSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const normalizedValue = TERM_MONTH_OPTIONS.includes(value) ? value : '';

  return (
    <select
      value={normalizedValue}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-9 w-full rounded-sm border border-white bg-white px-2 text-sm text-slate-800 shadow-inner"
    >
      <option value="" disabled>בחר תקופה</option>
      {TERM_MONTH_OPTIONS.map((months) => (
        <option key={months} value={months}>
          {months} ({formatTermLabel(months)})
        </option>
      ))}
    </select>
  );
}

function ResultCell({ value }: { value: string }) {
  return (
    <div className="grid h-9 place-items-center rounded-sm bg-[#55595c] px-2 text-sm font-bold text-white shadow-inner">
      {value}
    </div>
  );
}

function formatTermLabel(months: number) {
  const years = months / 12;
  if (years === 1) return '1 שנה';
  return `${years} שנים`;
}

function TrackRow({
  track,
  index,
  canDelete,
  onChange,
  onRemove,
}: {
  track: TrackInput;
  index: number;
  canDelete: boolean;
  onChange: (patch: Partial<TrackInput>) => void;
  onRemove: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const meta = TRACKS[track.kind];
  const summary = summarizeTrack(track);
  const rateOutOfRange = track.annualRatePct < meta.recommendedRange[0] || track.annualRatePct > meta.recommendedRange[1];

  function changeKind(kind: TrackKind) {
    const nextMeta = TRACKS[kind];
    onChange({
      kind,
      annualRatePct: nextMeta.defaultRatePct,
      annualCpiPct: nextMeta.indexed ? (track.annualCpiPct ?? 2.5) : undefined,
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">מסלול {index + 1}</Badge>
            <Badge variant="outline">{meta.short}</Badge>
            {meta.indexed && <Badge variant="outline">צמוד מדד</Badge>}
            {summary.totalPrepayments > 0 && <Badge variant="outline">סילוק עתידי</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAdvancedOpen((open) => !open)}>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            מתקדם
          </Button>
          {canDelete && (
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="מחק מסלול">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <SelectField label="מסלול" value={track.kind} onChange={(value) => changeKind(value as TrackKind)}>
          {TRACK_OPTIONS.map((option) => (
            <option key={option.kind} value={option.kind}>{option.labelHe}</option>
          ))}
        </SelectField>
        <SelectField label="שיטת החזר" value={track.method} onChange={(value) => onChange({ method: value as RepayMethod })}>
          <option value="shpitzer">שפיצר</option>
          <option value="equal_principal">קרן שווה</option>
          <option value="bullet">בוליט / בלון</option>
        </SelectField>
        <NumberField label="סכום" value={track.principal} onChange={(value) => onChange({ principal: value })} step={10_000} compact />
        <NumberField label="חודשים" value={track.months} onChange={(value) => onChange({ months: Math.max(1, value) })} step={1} compact />
        <NumberField
          label="ריבית %"
          value={track.annualRatePct}
          onChange={(value) => onChange({ annualRatePct: value })}
          step={0.05}
          compact
          warning={rateOutOfRange}
        />
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">החזר / סך</div>
          <div className="mt-1 text-sm font-semibold">{formatIls(summary.firstPayment)}</div>
          <div className="text-xs text-muted-foreground">{formatIls(summary.totalPayments)}</div>
        </div>
      </div>

      {meta.indexed && (
        <div className="mt-3 max-w-xs">
          <NumberField
            label="מדד שנתי צפוי %"
            value={track.annualCpiPct ?? 2.5}
            onChange={(value) => onChange({ annualCpiPct: value })}
            step={0.1}
            compact
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>טווח ריבית מומלץ: {meta.recommendedRange[0]}%-{meta.recommendedRange[1]}%</span>
        <span>שיא חודשי: <strong>{formatIls(summary.peakPayment)}</strong> · עלות לכל שקל: {summary.costPerShekel.toFixed(2)}</span>
      </div>

      {advancedOpen && (
        <div className="mt-4 grid gap-4 rounded-md border bg-muted/25 p-4 lg:grid-cols-3">
          <AdvancedBlock title="גרייס">
            <NumberField
              label="חודשי גרייס"
              value={track.graceMonths ?? 0}
              onChange={(value) => onChange({ graceMonths: Math.max(0, Math.min(60, value)) })}
              step={1}
              compact
            />
          </AdvancedBlock>
          <AdvancedBlock title="שינוי ריבית עתידי">
            <NumberField
              label="חודש שינוי"
              value={track.futureRateMonth ?? 0}
              onChange={(value) => onChange({ futureRateMonth: Math.max(0, value) })}
              step={1}
              compact
            />
            <NumberField
              label="שינוי בריבית %"
              value={track.futureRateDeltaPct ?? 0}
              onChange={(value) => onChange({ futureRateDeltaPct: value })}
              step={0.1}
              compact
            />
          </AdvancedBlock>
          <AdvancedBlock title="סילוק עתידי">
            <SelectField
              label="סוג סילוק"
              value={track.prepaymentType ?? 'none'}
              onChange={(value) => onChange({ prepaymentType: value as PrepaymentType })}
            >
              <option value="none">ללא</option>
              <option value="partial">חלקי</option>
              <option value="full">מלא</option>
            </SelectField>
            <NumberField
              label="חודש סילוק"
              value={track.prepaymentMonth ?? 0}
              onChange={(value) => onChange({ prepaymentMonth: Math.max(0, value) })}
              step={1}
              compact
            />
            {(track.prepaymentType ?? 'none') === 'partial' && (
              <NumberField
                label="סכום לסילוק"
                value={track.prepaymentAmount ?? 0}
                onChange={(value) => onChange({ prepaymentAmount: Math.max(0, value) })}
                step={10_000}
                compact
              />
            )}
            {(track.prepaymentType ?? 'none') === 'partial' && (
              <SelectField
                label="אחרי סילוק"
                value={track.prepaymentMode ?? 'reduce_payment'}
                onChange={(value) => onChange({ prepaymentMode: value as PrepaymentMode })}
              >
                <option value="reduce_payment">הורדת החזר</option>
                <option value="shorten_term">קיצור תקופה</option>
              </SelectField>
            )}
          </AdvancedBlock>
        </div>
      )}
    </div>
  );
}

function ResultsTable({ tracks, aggregate }: { tracks: TrackInput[]; aggregate: MixAggregate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          סיכום התמהיל
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-right">מסלול</th>
                <th className="p-2 text-right">סכום</th>
                <th className="p-2 text-right">חודשים</th>
                <th className="p-2 text-right">ריבית</th>
                <th className="p-2 text-right">החזר ראשון</th>
                <th className="p-2 text-right">החזר מקסימלי</th>
                <th className="p-2 text-right">סך ריבית</th>
                <th className="p-2 text-right">החזר כולל</th>
              </tr>
            </thead>
            <tbody>
              {aggregate.tracks.map((summary, index) => {
                const track = tracks[index];
                return (
                  <tr key={summary.id} className="border-t">
                    <td className="p-2"><Badge variant="outline">{TRACKS[summary.kind].short}</Badge></td>
                    <td className="p-2 tabular-nums">{formatIls(track?.principal ?? 0)}</td>
                    <td className="p-2 tabular-nums">{track?.months ?? 0}</td>
                    <td className="p-2 tabular-nums">{formatNumber(track?.annualRatePct ?? 0, 2)}%</td>
                    <td className="p-2 tabular-nums">{formatIls(summary.firstPayment)}</td>
                    <td className="p-2 tabular-nums">{formatIls(summary.peakPayment)}</td>
                    <td className="p-2 tabular-nums text-muted-foreground">{formatIls(summary.totalInterest)}</td>
                    <td className="p-2 tabular-nums font-semibold">{formatIls(summary.totalPayments)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ aggregate, requiredIncome }: { aggregate: MixAggregate; requiredIncome: number }) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">תוצאה מרכזית</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-primary p-4 text-primary-foreground">
          <div className="text-sm opacity-80">החזר חודשי ראשון</div>
          <div className="mt-1 text-3xl font-bold">{formatIls(aggregate.firstMonthlyPayment)}</div>
          <div className="mt-2 text-xs opacity-80">הכנסה מומלצת: {formatIls(requiredIncome)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="החזר מקסימלי" value={formatIls(aggregate.peakMonthlyPayment)} />
          <Metric label="סך הלוואה" value={formatIls(aggregate.totalPrincipal)} />
          <Metric label="סך ריבית" value={formatIls(aggregate.totalInterest)} />
          <Metric label="סך מדד" value={formatIls(aggregate.totalIndex)} />
          <Metric label="סילוקים" value={formatIls(aggregate.totalPrepayments)} />
          <Metric label="לכל שקל" value={`${aggregate.costPerShekel.toFixed(2)} ₪`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationCard({ validation }: { validation: ReturnType<typeof validateMix> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={validation.ok ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-amber-600'} />
          בדיקות בנק
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ProgressLine label="מסלולים קבועים" value={validation.totals.fixedShare} target={1 / 3} mode="min" />
        <ProgressLine label="משתנים קצרים" value={validation.totals.shortVariableShare} target={1 / 3} mode="max" />
        {validation.messages.length === 0 ? (
          <p className="rounded-md bg-emerald-500/10 p-3 text-emerald-700">התמהיל עומד בבדיקות הבסיסיות.</p>
        ) : (
          <div className="space-y-2">
            {validation.messages.map((message) => (
              <p key={message} className="rounded-md bg-amber-500/10 p-2 text-amber-700">{message}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MixComparison({
  items,
  mode,
}: {
  items: { mix: MixState; aggregate: MixAggregate; validation: ReturnType<typeof validateMix> }[];
  mode: CompareMode;
}) {
  if (mode === 'annual') return <AnnualComparison items={items} />;
  if (mode === 'monthly') return <MonthlyComparison items={items} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-right">תמהיל</th>
            <th className="p-2 text-right">החזר ראשון</th>
            <th className="p-2 text-right">החזר מקסימלי</th>
            <th className="p-2 text-right">סך ריבית</th>
            <th className="p-2 text-right">סך מדד</th>
            <th className="p-2 text-right">החזר כולל</th>
            <th className="p-2 text-right">ריבית משוקללת</th>
            <th className="p-2 text-right">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ mix, aggregate, validation }) => (
            <tr key={mix.id} className="border-t">
              <td className="p-2 font-semibold">{mix.name}</td>
              <td className="p-2 tabular-nums">{formatIls(aggregate.firstMonthlyPayment)}</td>
              <td className="p-2 tabular-nums">{formatIls(aggregate.peakMonthlyPayment)}</td>
              <td className="p-2 tabular-nums text-muted-foreground">{formatIls(aggregate.totalInterest)}</td>
              <td className="p-2 tabular-nums text-muted-foreground">{formatIls(aggregate.totalIndex)}</td>
              <td className="p-2 tabular-nums font-semibold">{formatIls(aggregate.totalRepayment)}</td>
              <td className="p-2 tabular-nums">{aggregate.weightedRatePct.toFixed(2)}%</td>
              <td className="p-2">
                <Badge variant={validation.ok ? 'secondary' : 'destructive'}>{validation.ok ? 'תקין' : 'דורש בדיקה'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnnualComparison({ items }: { items: { mix: MixState; aggregate: MixAggregate }[] }) {
  const years = Array.from({ length: 30 }, (_, index) => index + 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-right">שנה</th>
            {items.map(({ mix }) => (
              <th key={mix.id} className="p-2 text-right">{mix.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year} className="border-t">
              <td className="p-2 font-semibold">{year}</td>
              {items.map(({ mix, aggregate }) => {
                const row = aggregate.combinedMonthly[(year - 1) * 12];
                return <td key={mix.id} className="p-2 tabular-nums">{row ? formatIls(row.payment) : '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyComparison({ items }: { items: { mix: MixState; aggregate: MixAggregate }[] }) {
  const maxMonths = Math.max(...items.map(({ aggregate }) => aggregate.combinedMonthly.length), 0);
  const shownMonths = Array.from({ length: Math.min(maxMonths, 360) }, (_, index) => index + 1);
  return (
    <div className="max-h-[520px] overflow-auto rounded-md border">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th className="p-2 text-right">חודש</th>
            {items.map(({ mix }) => (
              <th key={mix.id} className="p-2 text-right">{mix.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shownMonths.map((month) => (
            <tr key={month} className="border-t">
              <td className="p-2 font-semibold">{month}</td>
              {items.map(({ mix, aggregate }) => {
                const row = aggregate.combinedMonthly[month - 1];
                return <td key={mix.id} className="p-2 tabular-nums">{row ? formatIls(row.payment) : '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentChart({
  aggregates,
  activeMixId,
}: {
  aggregates: { mix: MixState; aggregate: MixAggregate }[];
  activeMixId: string;
}) {
  const active = aggregates.find((item) => item.mix.id === activeMixId) ?? aggregates[0];
  const yearly = active?.aggregate.combinedMonthly
    .filter((_, index) => index % 12 === 0)
    .slice(0, 35)
    .map((row, index) => ({ year: index + 1, payment: row.payment })) ?? [];
  const peak = yearly.reduce((max, row) => Math.max(max, row.payment), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          התפתחות החזר חודשי
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-44 items-end gap-1 overflow-x-auto rounded-md border bg-muted/20 p-3">
          {yearly.map((row) => (
            <div key={row.year} className="flex min-w-8 flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-sm bg-primary"
                style={{ height: `${Math.max(8, (row.payment / peak) * 130)}px` }}
                title={`${row.year}: ${formatIls(row.payment)}`}
              />
              <span className="text-[10px] text-muted-foreground">{row.year}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlySchedule({ aggregate, mixName }: { aggregate: MixAggregate; mixName: string }) {
  const [open, setOpen] = useState(false);
  const rows = buildMonthlyRows(aggregate);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between p-4 text-right hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4 text-primary" />
          לוח סילוקין חודשי מלא - {mixName}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <CardContent>
          <div className="max-h-[560px] overflow-auto rounded-md border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-2 text-right">חודש</th>
                  <th className="p-2 text-right">החזר</th>
                  <th className="p-2 text-right">קרן</th>
                  <th className="p-2 text-right">ריבית</th>
                  <th className="p-2 text-right">הצמדה</th>
                  <th className="p-2 text-right">סילוק</th>
                  <th className="p-2 text-right">יתרה</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month} className="border-t">
                    <td className="p-2 font-semibold">{row.month}</td>
                    <td className="p-2 tabular-nums">{formatIls(row.payment)}</td>
                    <td className="p-2 tabular-nums">{formatIls(row.principal)}</td>
                    <td className="p-2 tabular-nums text-muted-foreground">{formatIls(row.interest)}</td>
                    <td className="p-2 tabular-nums text-muted-foreground">{formatIls(row.index)}</td>
                    <td className="p-2 tabular-nums text-muted-foreground">{row.extra ? formatIls(row.extra) : '—'}</td>
                    <td className="p-2 tabular-nums font-medium">{formatIls(row.balance)}</td>
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

function buildMonthlyRows(aggregate: MixAggregate) {
  const maxMonths = aggregate.tracks.reduce((max, track) => Math.max(max, track.schedule.length), 0);
  return Array.from({ length: maxMonths }, (_, index) => {
    const month = index + 1;
    return aggregate.tracks.reduce(
      (row, track) => {
        const item = track.schedule[index];
        if (!item) return row;
        return {
          month,
          payment: row.payment + item.payment,
          principal: row.principal + item.principal,
          interest: row.interest + item.interest,
          index: row.index + item.indexAdjustment,
          extra: row.extra + item.extraPayment,
          balance: row.balance + item.balance,
        };
      },
      { month, payment: 0, principal: 0, interest: 0, index: 0, extra: 0, balance: 0 },
    );
  });
}

function ScenarioPill({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-md border border-[#6f9ccc] bg-white px-3 py-2 text-right shadow-inner'
          : 'rounded-md border border-white/70 bg-[#c9def2] px-3 py-2 text-right hover:bg-white/80'
      }
    >
      <Home className="mb-1 h-4 w-4 text-[#5f8fbd]" />
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-[#5f7894]">{subtitle}</div>
    </button>
  );
}

function WorkbenchNumber({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
}) {
  return (
    <label className="block rounded-md border border-white/70 bg-[#d9eafb] px-3 py-2">
      <span className="mb-1 block text-center text-xs font-semibold text-[#385d82]">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 w-full rounded-md border border-white bg-white px-3 text-left text-base font-semibold text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#6d98c4]"
        dir="ltr"
      />
    </label>
  );
}

function DarkEditableCell({
  label,
  value,
  onChange,
  step,
  suffix,
  warning,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  suffix: string;
  warning?: boolean;
}) {
  return (
    <label className={warning ? 'block rounded-sm bg-amber-700 px-3 py-2 text-center text-white shadow-inner' : 'block rounded-sm bg-[#55595c] px-3 py-2 text-center text-white shadow-inner'}>
      <span className="mb-2 block border-b border-white/30 pb-1 text-xs font-semibold text-white/80">{label}</span>
      <span className="flex items-center justify-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="h-9 w-full rounded-sm border border-white/20 bg-white/95 px-2 text-center text-base font-bold text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
          dir="ltr"
        />
        <span className="min-w-5 text-sm font-bold">{suffix}</span>
      </span>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  compact,
  warning,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  compact?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <Label className={compact ? 'text-xs' : undefined}>{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className={warning ? 'border-amber-400 bg-white' : compact ? 'border-white bg-white' : undefined}
        dir="ltr"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {children}
      </select>
    </div>
  );
}

function DarkSummaryCell({
  label,
  value,
  large,
  warning,
}: {
  label: string;
  value: string;
  large?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={warning ? 'rounded-sm bg-amber-700 px-3 py-2 text-center text-white shadow-inner' : 'rounded-sm bg-[#55595c] px-3 py-2 text-center text-white shadow-inner'}>
      <div className="border-b border-white/30 pb-1 text-xs font-semibold text-white/80">{label}</div>
      <div className={large ? 'pt-2 text-xl font-bold' : 'pt-2 text-base font-bold'}>{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={warning ? 'rounded-md border border-amber-300 bg-amber-50 p-3' : accent ? 'rounded-md border border-primary/30 bg-primary/10 p-3' : 'rounded-md border bg-background p-3'}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: 'warning' | 'danger' | 'plain' }) {
  const className =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-muted bg-muted/35 text-muted-foreground';
  return (
    <div className={`rounded-md border p-3 text-sm leading-6 ${className}`}>
      {children}
    </div>
  );
}

function AdvancedBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      {children}
    </div>
  );
}

function ProgressLine({
  label,
  value,
  target,
  mode,
}: {
  label: string;
  value: number;
  target: number;
  mode: 'min' | 'max';
}) {
  const pct = Math.min(1, Math.max(0, value));
  const ok = mode === 'min' ? value >= target : value <= target;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className={ok ? 'text-emerald-700' : 'text-amber-700'}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={ok ? 'h-full bg-emerald-500' : 'h-full bg-amber-500'} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
