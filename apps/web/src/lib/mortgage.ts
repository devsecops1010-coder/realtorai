/**
 * Israeli mortgage calculation engine.
 *
 * Supports the multi-track ("תמהיל") model real Israeli mortgages use:
 * a single loan is split into 2-6 sub-loans ("מסלולים"), each with its
 * own interest type, indexation, repayment method, term and rate. The
 * borrower's monthly payment is the sum of all tracks.
 *
 * Track types (`TrackKind`):
 *   - prime          — variable rate tied to the Bank of Israel prime; unindexed
 *   - fixed_unlinked — "קל\"צ" — fixed rate, no CPI indexation
 *   - fixed_linked   — "ק\"צ" — fixed rate, principal grows with CPI
 *   - var5_unlinked  — "מל\"צ" — rate resets every 5 years; unindexed
 *   - var5_linked    — "מ\"צ" — rate resets every 5 years; indexed
 *
 * Repayment methods (`RepayMethod`):
 *   - shpitzer        — constant monthly payment (annuity), interest-heavy at start
 *   - equal_principal — principal portion is constant; total payment falls over time
 *
 * Indexation handling: indexed tracks (fixed_linked, var5_linked) inflate
 * the outstanding balance monthly by `(1+cpi)^(1/12)−1`. The payment is
 * recomputed against the inflated balance + remaining months, so users see
 * a growing payment over the life of the loan.
 *
 * The engine outputs (per track):
 *   - a month-by-month schedule (principal/interest/index/payment/balance)
 *   - track-level totals: total repayment, total interest, total index cost,
 *     first-month payment, peak monthly payment
 *
 * Aggregation across tracks gives the borrower's total monthly cash-out per
 * month and the mix's overall cost.
 *
 * NOTE: variable tracks are modelled as flat-rate for the entire life. A
 * real-world variable mortgage would step the rate up/down at the reset
 * boundaries, but the borrower can't know those rates in advance. Showing
 * the current rate as a constant gives the most honest projection.
 */

export type TrackKind =
  | 'prime'
  | 'fixed_unlinked'
  | 'fixed_linked'
  | 'var5_unlinked'
  | 'var5_linked';

export type RepayMethod = 'shpitzer' | 'equal_principal';

export interface TrackInput {
  id: string;
  kind: TrackKind;
  method: RepayMethod;
  principal: number;          // ₪
  annualRatePct: number;      // e.g. 5.5 for 5.5%
  months: number;             // total term, max 360
  /**
   * Annual CPI assumption (%). Ignored for unlinked tracks. Defaults to ~2.5%
   * — the long-run Israeli inflation target.
   */
  annualCpiPct?: number;
}

export interface ScheduleRow {
  month: number;          // 1-based
  payment: number;
  principal: number;      // principal portion of `payment`
  interest: number;       // interest portion of `payment`
  /**
   * Indexation added to the outstanding balance THIS month (₪). The user
   * doesn't pay this directly — it grows the balance — but accumulating it
   * gives the "total index cost" headline.
   */
  indexAdjustment: number;
  balance: number;        // outstanding principal AFTER this month's payment
}

export interface TrackSummary {
  id: string;
  kind: TrackKind;
  method: RepayMethod;
  schedule: ScheduleRow[];
  firstPayment: number;
  peakPayment: number;
  totalPayments: number;  // sum of all payments — what the borrower actually pays
  totalInterest: number;  // sum of interest portions
  totalIndex: number;     // sum of indexAdjustment over life
  costPerShekel: number;  // totalPayments / principal
}

export interface MixValidation {
  ok: boolean;
  /** Friendly Hebrew messages — one per violation. */
  messages: string[];
  /** Quick numerics for the UI. */
  totals: {
    sumOfPrincipals: number;
    fixedShare: number;   // 0..1 — share of loan in any fixed-rate track
    primeShare: number;   // 0..1 — share of loan in Prime
  };
}

export interface MixAggregate {
  tracks: TrackSummary[];
  /** Total principal across all tracks. */
  totalPrincipal: number;
  /** Sum of all first-month payments. */
  firstMonthlyPayment: number;
  /** Highest combined monthly payment across the life of the loan. */
  peakMonthlyPayment: number;
  totalRepayment: number;   // sum across tracks
  totalInterest: number;
  totalIndex: number;
  /** Monthly combined payment over time, used by the chart. */
  combinedMonthly: { month: number; payment: number }[];
}

// ---------------------------------------------------------------------------
// Track-level math
// ---------------------------------------------------------------------------

/**
 * Compute the Shpitzer monthly payment for a balance at this point in time.
 * Used both initially and after balance-changing events (e.g. monthly
 * indexation). Handles the zero-rate degenerate case explicitly to avoid
 * NaN.
 */
function shpitzerPayment(balance: number, monthlyRate: number, remainingMonths: number): number {
  if (remainingMonths <= 0 || balance <= 0) return 0;
  if (monthlyRate === 0) return balance / remainingMonths;
  const f = Math.pow(1 + monthlyRate, remainingMonths);
  return (balance * monthlyRate * f) / (f - 1);
}

function isLinked(kind: TrackKind): boolean {
  return kind === 'fixed_linked' || kind === 'var5_linked';
}

/** Convert annual nominal rate (%) to per-month decimal (e.g. 6%→0.005). */
function monthlyRate(annualPct: number): number {
  return annualPct / 100 / 12;
}

/** Convert annual CPI (%) to per-month inflation factor (e.g. 2.5%→0.002058). */
function monthlyCpi(annualCpiPct: number): number {
  if (annualCpiPct <= 0) return 0;
  return Math.pow(1 + annualCpiPct / 100, 1 / 12) - 1;
}

/**
 * Build a full month-by-month schedule for a single track. The returned
 * array has exactly `months` rows (or fewer if the balance reaches zero
 * early, which only happens with rounding artefacts).
 *
 * Both repayment methods share the same shape:
 *   1. Optionally inflate balance for the month (linked tracks only).
 *   2. Compute interest on the (post-inflation) balance.
 *   3. Compute principal portion per the method.
 *   4. Reduce balance, record the row.
 *
 * Equal-principal divides the *current* outstanding principal by remaining
 * months, which gives a slightly decreasing-payment profile even on linked
 * tracks (the rising balance is offset by the shorter remaining term).
 */
export function amortize(track: TrackInput): ScheduleRow[] {
  const r = monthlyRate(track.annualRatePct);
  const cpi = isLinked(track.kind) ? monthlyCpi(track.annualCpiPct ?? 0) : 0;
  const schedule: ScheduleRow[] = [];

  let balance = track.principal;
  for (let m = 1; m <= track.months; m++) {
    const remaining = track.months - m + 1;

    // 1. Inflate balance (linked tracks only).
    const indexAdjustment = balance * cpi;
    balance += indexAdjustment;

    // 2. Interest accrues on the inflated balance.
    const interest = balance * r;

    // 3. Principal portion depends on method.
    let payment: number;
    let principalPaid: number;
    if (track.method === 'shpitzer') {
      payment = shpitzerPayment(balance, r, remaining);
      principalPaid = payment - interest;
    } else {
      // Equal-principal: keep the principal portion constant relative to the
      // current balance + remaining term. On linked tracks this means the
      // principal portion creeps up slightly each month as the balance
      // inflates, but the payment still trends downward because the interest
      // drop dominates.
      principalPaid = balance / remaining;
      payment = principalPaid + interest;
    }

    // 4. Apply principal payment.
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month: m,
      payment,
      principal: principalPaid,
      interest,
      indexAdjustment,
      balance,
    });
  }
  return schedule;
}

export function summarizeTrack(track: TrackInput): TrackSummary {
  const schedule = amortize(track);
  let totalPayments = 0;
  let totalInterest = 0;
  let totalIndex = 0;
  let peak = 0;
  for (const r of schedule) {
    totalPayments += r.payment;
    totalInterest += r.interest;
    totalIndex += r.indexAdjustment;
    if (r.payment > peak) peak = r.payment;
  }
  return {
    id: track.id,
    kind: track.kind,
    method: track.method,
    schedule,
    firstPayment: schedule[0]?.payment ?? 0,
    peakPayment: peak,
    totalPayments,
    totalInterest,
    totalIndex,
    costPerShekel: track.principal > 0 ? totalPayments / track.principal : 0,
  };
}

// ---------------------------------------------------------------------------
// Mix-level math
// ---------------------------------------------------------------------------

/**
 * Bank-of-Israel composition guard-rails. Current rules (2020 update,
 * still active 2026):
 *
 *   - At least ⅓ of the loan must be in fixed-rate tracks
 *     (either קל\"צ or ק\"צ). This is the floor for "predictable" share.
 *   - At most ⅔ of the loan may be in Prime (the most volatile track).
 *
 * The previous 2013 rule that required ⅓ specifically in fixed-unlinked
 * was relaxed in 2020 to "any fixed", which is what we enforce.
 *
 * Banks will refuse to approve a mix outside these bounds, so we surface
 * a clear validation error rather than letting the user finalize a
 * non-bankable mix.
 */
export function validateMix(tracks: TrackInput[], targetTotal: number): MixValidation {
  const messages: string[] = [];
  const sumOfPrincipals = tracks.reduce((s, t) => s + (t.principal || 0), 0);
  const fixedSum = tracks
    .filter((t) => t.kind === 'fixed_unlinked' || t.kind === 'fixed_linked')
    .reduce((s, t) => s + (t.principal || 0), 0);
  const primeSum = tracks
    .filter((t) => t.kind === 'prime')
    .reduce((s, t) => s + (t.principal || 0), 0);

  const fixedShare = sumOfPrincipals > 0 ? fixedSum / sumOfPrincipals : 0;
  const primeShare = sumOfPrincipals > 0 ? primeSum / sumOfPrincipals : 0;

  // Allow ±1% wiggle on the total so users can type round numbers.
  const totalDelta = Math.abs(sumOfPrincipals - targetTotal);
  if (targetTotal > 0 && totalDelta > targetTotal * 0.01 + 100) {
    messages.push(
      `סך המסלולים (${Math.round(sumOfPrincipals).toLocaleString('he-IL')}) לא תואם לסכום ההלוואה (${Math.round(targetTotal).toLocaleString('he-IL')}). הפרש: ${Math.round(sumOfPrincipals - targetTotal).toLocaleString('he-IL')} ₪.`,
    );
  }
  if (fixedShare < 1 / 3 - 0.001 && sumOfPrincipals > 0) {
    messages.push(
      `לפחות שליש מההלוואה חייב להיות במסלול קבוע (קל\"צ או ק\"צ). כרגע: ${(fixedShare * 100).toFixed(0)}%.`,
    );
  }
  if (primeShare > 2 / 3 + 0.001) {
    messages.push(
      `מקסימום שני שלישים מההלוואה במסלול פריים. כרגע: ${(primeShare * 100).toFixed(0)}%.`,
    );
  }

  return {
    ok: messages.length === 0,
    messages,
    totals: { sumOfPrincipals, fixedShare, primeShare },
  };
}

export function aggregateMix(tracks: TrackInput[]): MixAggregate {
  const summaries = tracks.map(summarizeTrack);
  // Length of the longest track — combined chart needs to span everything.
  const longestMonths = summaries.reduce((m, s) => Math.max(m, s.schedule.length), 0);

  const combinedMonthly: { month: number; payment: number }[] = [];
  for (let m = 1; m <= longestMonths; m++) {
    let sum = 0;
    for (const s of summaries) {
      const row = s.schedule[m - 1];
      if (row) sum += row.payment;
    }
    combinedMonthly.push({ month: m, payment: sum });
  }

  return {
    tracks: summaries,
    totalPrincipal: tracks.reduce((s, t) => s + t.principal, 0),
    firstMonthlyPayment: combinedMonthly[0]?.payment ?? 0,
    peakMonthlyPayment: combinedMonthly.reduce((m, r) => Math.max(m, r.payment), 0),
    totalRepayment: summaries.reduce((s, t) => s + t.totalPayments, 0),
    totalInterest: summaries.reduce((s, t) => s + t.totalInterest, 0),
    totalIndex: summaries.reduce((s, t) => s + t.totalIndex, 0),
    combinedMonthly,
  };
}

// ---------------------------------------------------------------------------
// Track metadata (labels, recommended rates, indexation flag).
// Recommended rates are typical April 2026 market quotes, intended as
// sensible defaults — not promises. Banks quote their own.
// ---------------------------------------------------------------------------

export interface TrackMeta {
  kind: TrackKind;
  labelHe: string;
  short: string;          // e.g. "קל\"צ"
  description: string;
  indexed: boolean;
  defaultRatePct: number;
  recommendedRange: [number, number];
}

export const TRACKS: Record<TrackKind, TrackMeta> = {
  prime: {
    kind: 'prime',
    labelHe: 'פריים',
    short: 'פריים',
    description: 'משתנה, נצמדת לריבית הפריים של בנק ישראל. ללא הצמדה למדד.',
    indexed: false,
    defaultRatePct: 5.5,
    recommendedRange: [5.0, 6.25],
  },
  fixed_unlinked: {
    kind: 'fixed_unlinked',
    labelHe: 'קבועה לא צמודה (קל"צ)',
    short: 'קל"צ',
    description: 'ריבית קבועה לכל אורך התקופה. ללא הצמדה — הכי יציב, יקר יחסית.',
    indexed: false,
    defaultRatePct: 5.2,
    recommendedRange: [4.6, 5.8],
  },
  fixed_linked: {
    kind: 'fixed_linked',
    labelHe: 'קבועה צמודה (ק"צ)',
    short: 'ק"צ',
    description: 'ריבית קבועה, אך הקרן מוצמדת למדד המחירים לצרכן.',
    indexed: true,
    defaultRatePct: 3.4,
    recommendedRange: [2.9, 3.8],
  },
  var5_unlinked: {
    kind: 'var5_unlinked',
    labelHe: 'משתנה 5 שנים לא צמודה (מל"צ)',
    short: 'מל"צ',
    description: 'הריבית משתנה כל 5 שנים לפי עוגן. ללא הצמדה.',
    indexed: false,
    defaultRatePct: 4.5,
    recommendedRange: [4.0, 5.0],
  },
  var5_linked: {
    kind: 'var5_linked',
    labelHe: 'משתנה 5 שנים צמודה (מ"צ)',
    short: 'מ"צ',
    description: 'הריבית משתנה כל 5 שנים, צמודה למדד. הזולה ביותר היום, חשופה לעליות.',
    indexed: true,
    defaultRatePct: 3.0,
    recommendedRange: [2.5, 3.5],
  },
};

/**
 * Sensible starter mix matching the "Stockton ⅓-⅓-⅓" Israeli convention.
 * Caller passes the total loan; we split into three tracks.
 */
export function defaultMix(totalPrincipal: number, totalMonths = 25 * 12): TrackInput[] {
  const third = Math.round(totalPrincipal / 3 / 1000) * 1000;
  const remainder = totalPrincipal - 2 * third;
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
