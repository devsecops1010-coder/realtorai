/**
 * Israeli mortgage calculation engine.
 *
 * The public calculator is built around the Israeli "תמהיל" workflow:
 * several tracks, each with its own rate, term, indexation, repayment method
 * and optional advanced events such as grace, future rate change and prepayment.
 */

export type TrackKind =
  | 'prime'
  | 'fixed_unlinked'
  | 'fixed_linked'
  | 'var5_unlinked'
  | 'var5_linked'
  | 'eligibility'
  | 'euro'
  | 'dollar'
  | 'makam'
  | 'var1_linked'
  | 'var2_linked'
  | 'var10_linked'
  | 'var2_unlinked'
  | 'var3_unlinked';

export type RepayMethod = 'shpitzer' | 'equal_principal' | 'bullet';
export type PrepaymentType = 'none' | 'partial' | 'full';
export type PrepaymentMode = 'reduce_payment' | 'shorten_term';

export interface TrackInput {
  id: string;
  kind: TrackKind;
  method: RepayMethod;
  principal: number;
  annualRatePct: number;
  months: number;
  annualCpiPct?: number;
  graceMonths?: number;
  futureRateMonth?: number;
  futureRateDeltaPct?: number;
  prepaymentType?: PrepaymentType;
  prepaymentMonth?: number;
  prepaymentAmount?: number;
  prepaymentMode?: PrepaymentMode;
}

export interface ScheduleRow {
  month: number;
  payment: number;
  regularPayment: number;
  principal: number;
  interest: number;
  indexAdjustment: number;
  extraPayment: number;
  annualRatePct: number;
  balance: number;
}

export interface TrackSummary {
  id: string;
  kind: TrackKind;
  method: RepayMethod;
  schedule: ScheduleRow[];
  firstPayment: number;
  peakPayment: number;
  totalPayments: number;
  totalInterest: number;
  totalIndex: number;
  totalPrepayments: number;
  costPerShekel: number;
  effectiveAnnualRatePct: number;
}

export interface MixValidation {
  ok: boolean;
  messages: string[];
  totals: {
    sumOfPrincipals: number;
    fixedShare: number;
    shortVariableShare: number;
  };
}

export interface MixAggregate {
  tracks: TrackSummary[];
  totalPrincipal: number;
  firstMonthlyPayment: number;
  peakMonthlyPayment: number;
  totalRepayment: number;
  totalInterest: number;
  totalIndex: number;
  totalPrepayments: number;
  costPerShekel: number;
  weightedRatePct: number;
  combinedMonthly: { month: number; payment: number; balance: number }[];
}

export interface TrackMeta {
  kind: TrackKind;
  labelHe: string;
  short: string;
  description: string;
  indexed: boolean;
  defaultRatePct: number;
  recommendedRange: [number, number];
  shortVariable: boolean;
}

export const TRACKS: Record<TrackKind, TrackMeta> = {
  prime: {
    kind: 'prime',
    labelHe: 'פריים',
    short: 'פריים',
    description: 'ריבית משתנה הצמודה לפריים, ללא מדד.',
    indexed: false,
    defaultRatePct: 5.5,
    recommendedRange: [5.0, 6.25],
    shortVariable: true,
  },
  fixed_unlinked: {
    kind: 'fixed_unlinked',
    labelHe: 'קבועה לא צמודה',
    short: 'קל"צ',
    description: 'ריבית קבועה ללא הצמדה למדד.',
    indexed: false,
    defaultRatePct: 5.2,
    recommendedRange: [4.6, 5.8],
    shortVariable: false,
  },
  fixed_linked: {
    kind: 'fixed_linked',
    labelHe: 'קבועה צמודה',
    short: 'ק"צ',
    description: 'ריבית קבועה, הקרן מוצמדת למדד.',
    indexed: true,
    defaultRatePct: 3.4,
    recommendedRange: [2.9, 3.8],
    shortVariable: false,
  },
  var5_unlinked: {
    kind: 'var5_unlinked',
    labelHe: 'משתנה כל 5 לא צמודה',
    short: 'מל"צ',
    description: 'ריבית משתנה כל 5 שנים, ללא מדד.',
    indexed: false,
    defaultRatePct: 4.5,
    recommendedRange: [4.0, 5.0],
    shortVariable: false,
  },
  var5_linked: {
    kind: 'var5_linked',
    labelHe: 'משתנה כל 5 צמודה',
    short: 'מ"צ',
    description: 'ריבית משתנה כל 5 שנים, הקרן מוצמדת למדד.',
    indexed: true,
    defaultRatePct: 3.0,
    recommendedRange: [2.5, 3.5],
    shortVariable: false,
  },
  eligibility: {
    kind: 'eligibility',
    labelHe: 'זכאות מדינה',
    short: 'זכאות',
    description: 'מסלול זכאות מדינה, בדרך כלל צמוד מדד.',
    indexed: true,
    defaultRatePct: 3.0,
    recommendedRange: [2.3, 3.5],
    shortVariable: false,
  },
  euro: {
    kind: 'euro',
    labelHe: 'יורו',
    short: 'יורו',
    description: 'מסלול מט"ח משתנה, חשוף למטבע ולריבית.',
    indexed: false,
    defaultRatePct: 5.1,
    recommendedRange: [4.6, 5.8],
    shortVariable: true,
  },
  dollar: {
    kind: 'dollar',
    labelHe: 'דולר',
    short: 'דולר',
    description: 'מסלול מט"ח משתנה, חשוף למטבע ולריבית.',
    indexed: false,
    defaultRatePct: 5.4,
    recommendedRange: [4.9, 6.2],
    shortVariable: true,
  },
  makam: {
    kind: 'makam',
    labelHe: 'עוגן מק"מ',
    short: 'מק"מ',
    description: 'ריבית משתנה בתדירות קצרה לפי עוגן מק"מ.',
    indexed: false,
    defaultRatePct: 5.3,
    recommendedRange: [4.8, 6.0],
    shortVariable: true,
  },
  var1_linked: {
    kind: 'var1_linked',
    labelHe: 'משתנה כל שנה צמודה',
    short: 'מ"צ 1',
    description: 'ריבית משתנה כל שנה, צמודה למדד.',
    indexed: true,
    defaultRatePct: 3.1,
    recommendedRange: [2.6, 3.8],
    shortVariable: true,
  },
  var2_linked: {
    kind: 'var2_linked',
    labelHe: 'משתנה כל שנתיים צמודה',
    short: 'מ"צ 2',
    description: 'ריבית משתנה כל שנתיים, צמודה למדד.',
    indexed: true,
    defaultRatePct: 3.2,
    recommendedRange: [2.7, 3.9],
    shortVariable: true,
  },
  var10_linked: {
    kind: 'var10_linked',
    labelHe: 'משתנה כל 10 צמודה',
    short: 'מ"צ 10',
    description: 'ריבית משתנה כל 10 שנים, צמודה למדד.',
    indexed: true,
    defaultRatePct: 3.6,
    recommendedRange: [3.0, 4.2],
    shortVariable: false,
  },
  var2_unlinked: {
    kind: 'var2_unlinked',
    labelHe: 'משתנה כל שנתיים לא צמודה',
    short: 'מל"צ 2',
    description: 'ריבית משתנה כל שנתיים, ללא מדד.',
    indexed: false,
    defaultRatePct: 4.8,
    recommendedRange: [4.2, 5.5],
    shortVariable: true,
  },
  var3_unlinked: {
    kind: 'var3_unlinked',
    labelHe: 'משתנה כל 3 לא צמודה',
    short: 'מל"צ 3',
    description: 'ריבית משתנה כל 3 שנים, ללא מדד.',
    indexed: false,
    defaultRatePct: 4.7,
    recommendedRange: [4.1, 5.4],
    shortVariable: true,
  },
};

export const TRACK_OPTIONS = Object.values(TRACKS);

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function monthlyRate(annualPct: number): number {
  return annualPct / 100 / 12;
}

function monthlyCpi(annualCpiPct: number): number {
  if (annualCpiPct <= 0) return 0;
  return Math.pow(1 + annualCpiPct / 100, 1 / 12) - 1;
}

function shpitzerPayment(balance: number, monthlyRateValue: number, remainingMonths: number): number {
  if (remainingMonths <= 0 || balance <= 0) return 0;
  if (monthlyRateValue === 0) return balance / remainingMonths;
  const factor = Math.pow(1 + monthlyRateValue, remainingMonths);
  return (balance * monthlyRateValue * factor) / (factor - 1);
}

function effectiveAnnualRate(track: TrackInput, month: number): number {
  const futureMonth = track.futureRateMonth ?? 0;
  const delta = track.futureRateDeltaPct ?? 0;
  if (futureMonth > 0 && month >= futureMonth) {
    return Math.max(0, track.annualRatePct + delta);
  }
  return Math.max(0, track.annualRatePct);
}

export function amortize(track: TrackInput): ScheduleRow[] {
  const meta = TRACKS[track.kind];
  const cpi = meta.indexed ? monthlyCpi(track.annualCpiPct ?? 0) : 0;
  const months = clamp(Math.round(track.months || 0), 1, 480);
  const graceMonths = clamp(Math.round(track.graceMonths ?? 0), 0, Math.min(60, months - 1));
  const prepaymentType = track.prepaymentType ?? 'none';
  const prepaymentMonth = clamp(Math.round(track.prepaymentMonth ?? 0), 0, months);
  const prepaymentAmount = Math.max(0, track.prepaymentAmount ?? 0);
  const prepaymentMode = track.prepaymentMode ?? 'reduce_payment';
  const schedule: ScheduleRow[] = [];

  let balance = Math.max(0, track.principal || 0);
  let lockedPayment: number | null = null;

  for (let month = 1; month <= months && balance > 0.01; month += 1) {
    const remainingMonths = months - month + 1;
    const annualRatePct = effectiveAnnualRate(track, month);
    const rate = monthlyRate(annualRatePct);

    const indexAdjustment = balance * cpi;
    balance += indexAdjustment;

    const interest = balance * rate;
    let principal = 0;
    let regularPayment = interest;

    if (track.method === 'bullet') {
      if (month === months) {
        principal = balance;
        regularPayment = interest + principal;
      }
    } else if (month <= graceMonths) {
      principal = 0;
      regularPayment = interest;
    } else if (track.method === 'equal_principal') {
      principal = balance / remainingMonths;
      regularPayment = interest + principal;
      if (lockedPayment && lockedPayment > regularPayment) {
        principal = Math.min(balance, Math.max(0, lockedPayment - interest));
        regularPayment = interest + principal;
      }
    } else {
      const computedPayment = shpitzerPayment(balance, rate, remainingMonths);
      regularPayment = lockedPayment ? Math.max(lockedPayment, computedPayment) : computedPayment;
      if (month === months) regularPayment = interest + balance;
      principal = Math.min(balance, Math.max(0, regularPayment - interest));
      regularPayment = interest + principal;
    }

    balance = Math.max(0, balance - principal);

    let extraPayment = 0;
    if (prepaymentType !== 'none' && prepaymentMonth === month && balance > 0.01) {
      if (prepaymentType === 'full') {
        extraPayment = balance;
        balance = 0;
      } else {
        extraPayment = Math.min(balance, prepaymentAmount);
        balance = Math.max(0, balance - extraPayment);
        if (prepaymentMode === 'shorten_term' && track.method !== 'bullet') {
          lockedPayment = Math.max(lockedPayment ?? 0, regularPayment);
        }
      }
    }

    schedule.push({
      month,
      payment: regularPayment + extraPayment,
      regularPayment,
      principal,
      interest,
      indexAdjustment,
      extraPayment,
      annualRatePct,
      balance,
    });
  }

  return schedule;
}

export function summarizeTrack(track: TrackInput): TrackSummary {
  const schedule = amortize(track);
  const totalPayments = schedule.reduce((sum, row) => sum + row.payment, 0);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalIndex = schedule.reduce((sum, row) => sum + row.indexAdjustment, 0);
  const totalPrepayments = schedule.reduce((sum, row) => sum + row.extraPayment, 0);
  const weightedRateNumerator = schedule.reduce((sum, row) => sum + row.annualRatePct * row.regularPayment, 0);
  const weightedRateDenominator = schedule.reduce((sum, row) => sum + row.regularPayment, 0);

  return {
    id: track.id,
    kind: track.kind,
    method: track.method,
    schedule,
    firstPayment: schedule[0]?.payment ?? 0,
    peakPayment: schedule.reduce((max, row) => Math.max(max, row.payment), 0),
    totalPayments,
    totalInterest,
    totalIndex,
    totalPrepayments,
    costPerShekel: track.principal > 0 ? totalPayments / track.principal : 0,
    effectiveAnnualRatePct: weightedRateDenominator > 0 ? weightedRateNumerator / weightedRateDenominator : track.annualRatePct,
  };
}

export function validateMix(tracks: TrackInput[], targetTotal: number): MixValidation {
  const messages: string[] = [];
  const sumOfPrincipals = tracks.reduce((sum, track) => sum + (track.principal || 0), 0);
  const fixedSum = tracks
    .filter((track) => track.kind === 'fixed_unlinked' || track.kind === 'fixed_linked')
    .reduce((sum, track) => sum + (track.principal || 0), 0);
  const shortVariableSum = tracks
    .filter((track) => TRACKS[track.kind].shortVariable)
    .reduce((sum, track) => sum + (track.principal || 0), 0);
  const fixedShare = sumOfPrincipals > 0 ? fixedSum / sumOfPrincipals : 0;
  const shortVariableShare = sumOfPrincipals > 0 ? shortVariableSum / sumOfPrincipals : 0;

  const totalDelta = Math.abs(sumOfPrincipals - targetTotal);
  if (targetTotal > 0 && totalDelta > targetTotal * 0.01 + 100) {
    messages.push(
      `סך המסלולים (${Math.round(sumOfPrincipals).toLocaleString('he-IL')}) לא תואם לסכום ההלוואה (${Math.round(targetTotal).toLocaleString('he-IL')}).`,
    );
  }
  if (fixedShare < 1 / 3 - 0.001 && sumOfPrincipals > 0) {
    messages.push(`לפחות שליש מההלוואה צריך להיות במסלול קבוע. כרגע: ${(fixedShare * 100).toFixed(0)}%.`);
  }
  if (shortVariableShare > 1 / 3 + 0.001) {
    messages.push(`מומלץ לא לעבור שליש במסלולים משתנים בתדירות קצרה. כרגע: ${(shortVariableShare * 100).toFixed(0)}%.`);
  }
  tracks.forEach((track, index) => {
    const label = `מסלול ${index + 1}`;
    if ((track.graceMonths ?? 0) > 60) messages.push(`${label}: גרייס מוגבל עד 60 חודשים.`);
    if ((track.prepaymentType ?? 'none') !== 'none' && !(track.prepaymentMonth && track.prepaymentMonth > 0)) {
      messages.push(`${label}: לסילוק עתידי צריך להגדיר חודש.`);
    }
    if (track.method === 'bullet' && (track.graceMonths ?? 0) > 0) {
      messages.push(`${label}: במסלול בוליט אין צורך להגדיר גרייס בנפרד.`);
    }
  });

  return {
    ok: messages.length === 0,
    messages,
    totals: { sumOfPrincipals, fixedShare, shortVariableShare },
  };
}

export function aggregateMix(tracks: TrackInput[]): MixAggregate {
  const summaries = tracks.map(summarizeTrack);
  const longestMonths = summaries.reduce((max, summary) => Math.max(max, summary.schedule.length), 0);
  const combinedMonthly: { month: number; payment: number; balance: number }[] = [];

  for (let month = 1; month <= longestMonths; month += 1) {
    let payment = 0;
    let balance = 0;
    summaries.forEach((summary) => {
      const row = summary.schedule[month - 1];
      if (row) {
        payment += row.payment;
        balance += row.balance;
      }
    });
    combinedMonthly.push({ month, payment, balance });
  }

  const totalPrincipal = tracks.reduce((sum, track) => sum + (track.principal || 0), 0);
  const totalRepayment = summaries.reduce((sum, summary) => sum + summary.totalPayments, 0);
  const weightedRateNumerator = tracks.reduce((sum, track) => sum + (track.principal || 0) * (track.annualRatePct || 0), 0);

  return {
    tracks: summaries,
    totalPrincipal,
    firstMonthlyPayment: combinedMonthly[0]?.payment ?? 0,
    peakMonthlyPayment: combinedMonthly.reduce((max, row) => Math.max(max, row.payment), 0),
    totalRepayment,
    totalInterest: summaries.reduce((sum, summary) => sum + summary.totalInterest, 0),
    totalIndex: summaries.reduce((sum, summary) => sum + summary.totalIndex, 0),
    totalPrepayments: summaries.reduce((sum, summary) => sum + summary.totalPrepayments, 0),
    costPerShekel: totalPrincipal > 0 ? totalRepayment / totalPrincipal : 0,
    weightedRatePct: totalPrincipal > 0 ? weightedRateNumerator / totalPrincipal : 0,
    combinedMonthly,
  };
}

export function defaultMix(totalPrincipal: number, totalMonths = 30 * 12): TrackInput[] {
  const third = Math.round(totalPrincipal / 3 / 1000) * 1000;
  const remainder = Math.max(0, totalPrincipal - 2 * third);
  return [
    {
      id: 't1',
      kind: 'fixed_unlinked',
      method: 'shpitzer',
      principal: third,
      annualRatePct: TRACKS.fixed_unlinked.defaultRatePct,
      months: totalMonths,
    },
    {
      id: 't2',
      kind: 'fixed_linked',
      method: 'shpitzer',
      principal: third,
      annualRatePct: TRACKS.fixed_linked.defaultRatePct,
      months: totalMonths,
      annualCpiPct: 2.5,
    },
    {
      id: 't3',
      kind: 'prime',
      method: 'shpitzer',
      principal: remainder,
      annualRatePct: TRACKS.prime.defaultRatePct,
      months: totalMonths,
    },
  ];
}
