'use client';

/**
 * Hierarchical / cascading geo picker — drill-down across the 4 IL geo
 * levels we actually carry data for:
 *
 *   מחוז (district)  →  עיר (settlement)  →  שכונה (neighborhood)?  →  רחוב (street)
 *
 * The shape mirrors how an Israeli buyer thinks about location:
 * "I want a 4-room in the מרכז district, in רמת גן, around שכונת התקווה,
 *  on רחוב ז'בוטינסקי". Each level scopes the next — picking a district
 * narrows the city list, picking a city narrows the neighborhood + street
 * lists, etc.
 *
 * Why dropdowns instead of free-text autocomplete:
 *   - We already have a free-text autocomplete in the hero. This control
 *     is for the user who *doesn't* know the city name yet — they're
 *     starting from "I want מרכז" or "I want the כרמל area of Haifa".
 *   - Forcing a structured pick guarantees we save a `settlementId` /
 *     `neighborhoodId` / `streetId` on the property and not just free
 *     text — that's what makes downstream filtering by neighborhood
 *     actually work.
 *
 * State model: fully controlled. The parent owns the `value` (everything
 * picked + the canonical Hebrew names). `onChange` fires on every step
 * so the parent can react (e.g. push to URL) immediately, or store the
 * value and only submit on a "search" button.
 *
 * Skipping levels: neighborhood is optional everywhere (lots of small
 * cities have no neighborhoods). The "skip" pseudo-option lets the user
 * jump straight to street. Street is also optional — a user searching
 * "all properties in רמת גן" leaves it empty.
 */

import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronLeft, Layers, Loader2, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

// ─── Domain types ──────────────────────────────────────────────────

interface District {
  id: string;
  code: string;
  nameHe: string;
  nameEn: string | null;
  _count: { settlements: number };
}

interface Settlement {
  id: string;
  code: number;
  nameHe: string;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  district: { id: string; nameHe: string };
}

interface Neighborhood {
  id: string;
  slug: string;
  nameHe: string;
  latitude: number | null;
  longitude: number | null;
}

interface Street {
  id: string;
  code: number;
  nameHe: string;
}

// ─── Value shape ───────────────────────────────────────────────────

export interface HierarchicalSearchValue {
  districtId: string | null;
  districtName: string | null;
  settlementId: string | null;
  settlementName: string | null;
  // Centroid of the picked settlement, cached so consumers can geocode
  // without an extra round-trip.
  latitude: number | null;
  longitude: number | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  streetId: string | null;
  streetName: string | null;
}

export const EMPTY_HIERARCHICAL_SEARCH: HierarchicalSearchValue = {
  districtId: null,
  districtName: null,
  settlementId: null,
  settlementName: null,
  latitude: null,
  longitude: null,
  neighborhoodId: null,
  neighborhoodName: null,
  streetId: null,
  streetName: null,
};

// ─── Component ─────────────────────────────────────────────────────

export function HierarchicalSearch({
  value,
  onChange,
  showNeighborhood = true,
  showStreet = true,
  size = 'default',
  className,
}: {
  value: HierarchicalSearchValue;
  onChange: (next: HierarchicalSearchValue) => void;
  /** Hide the neighborhood step (e.g. on the marketplace filter bar
   *  where the user typically searches by city only). */
  showNeighborhood?: boolean;
  /** Hide the street step (same rationale as above). */
  showStreet?: boolean;
  /** `compact` shrinks paddings + font so it fits inside the hero card
   *  without dwarfing the primary search input. */
  size?: 'default' | 'compact';
  className?: string;
}) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);

  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────────

  const fetchDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    try {
      const res = await fetch(`${API}/geo/districts`);
      if (!res.ok) return;
      const data = (await res.json()) as District[];
      // CBS districts are 7 fixed entries — sort by Hebrew name for a
      // stable, readable list.
      setDistricts(data.sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he')));
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  const fetchSettlements = useCallback(async (districtId: string) => {
    setLoadingSettlements(true);
    try {
      // Pull up to 200 cities in the district — Center district has ~70
      // settlements, the max we'll ever see is ~170 (HaMerkaz). 200 is
      // safely above that with room to grow.
      const res = await fetch(`${API}/geo/settlements?districtId=${districtId}&take=200`);
      if (!res.ok) return;
      const data = (await res.json()) as Settlement[];
      // Server returns by population desc; for a long alphabetized
      // dropdown we re-sort by Hebrew name. Population still shows in
      // the label so the user can scan for "the big one".
      setSettlements(data.sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he')));
    } finally {
      setLoadingSettlements(false);
    }
  }, []);

  const fetchNeighborhoods = useCallback(async (settlementId: string) => {
    setLoadingNeighborhoods(true);
    try {
      const res = await fetch(
        `${API}/geo/neighborhoods?settlementId=${settlementId}&take=100`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as Neighborhood[];
      setNeighborhoods(data);
    } finally {
      setLoadingNeighborhoods(false);
    }
  }, []);

  const fetchStreets = useCallback(async (settlementId: string) => {
    setLoadingStreets(true);
    try {
      // Streets can run into thousands per city. Cap at 200 — past that
      // a dropdown is unusable anyway and the user should use the
      // free-text autocomplete instead.
      const res = await fetch(
        `${API}/geo/streets?settlementId=${settlementId}&take=200`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as Street[];
      setStreets(data);
    } finally {
      setLoadingStreets(false);
    }
  }, []);

  // ── Effects: cascading fetches ─────────────────────────────────

  // Load districts on mount — there are only 7, cheap and lets the
  // dropdown be responsive on first click.
  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  // District change → reload settlements + clear deeper levels in
  // local state. (Parent already cleared them via the onChange below.)
  useEffect(() => {
    if (value.districtId) {
      fetchSettlements(value.districtId);
    } else {
      setSettlements([]);
    }
    setNeighborhoods([]);
    setStreets([]);
  }, [value.districtId, fetchSettlements]);

  // Settlement change → reload neighborhoods + streets in parallel.
  useEffect(() => {
    if (value.settlementId) {
      if (showNeighborhood) fetchNeighborhoods(value.settlementId);
      if (showStreet) fetchStreets(value.settlementId);
    } else {
      setNeighborhoods([]);
      setStreets([]);
    }
  }, [value.settlementId, showNeighborhood, showStreet, fetchNeighborhoods, fetchStreets]);

  // ── Pickers ─────────────────────────────────────────────────────

  function pickDistrict(districtId: string) {
    const d = districts.find((x) => x.id === districtId) ?? null;
    onChange({
      ...EMPTY_HIERARCHICAL_SEARCH,
      districtId: d?.id ?? null,
      districtName: d?.nameHe ?? null,
    });
  }

  function pickSettlement(settlementId: string) {
    const s = settlements.find((x) => x.id === settlementId) ?? null;
    onChange({
      // Preserve district (it's the parent) but reset everything below.
      districtId: value.districtId,
      districtName: value.districtName,
      settlementId: s?.id ?? null,
      settlementName: s?.nameHe ?? null,
      latitude: s?.latitude ?? null,
      longitude: s?.longitude ?? null,
      neighborhoodId: null,
      neighborhoodName: null,
      streetId: null,
      streetName: null,
    });
  }

  function pickNeighborhood(neighborhoodId: string) {
    const n = neighborhoods.find((x) => x.id === neighborhoodId) ?? null;
    onChange({
      ...value,
      neighborhoodId: n?.id ?? null,
      neighborhoodName: n?.nameHe ?? null,
      // Picking a neighborhood does NOT reset the street — the user
      // might know both ("the part of ז'בוטינסקי that's in הגפן"),
      // and we don't want to make them re-pick.
    });
  }

  function pickStreet(streetId: string) {
    const st = streets.find((x) => x.id === streetId) ?? null;
    onChange({
      ...value,
      streetId: st?.id ?? null,
      streetName: st?.nameHe ?? null,
    });
  }

  // ── Render ──────────────────────────────────────────────────────

  const fieldHeight = size === 'compact' ? 'h-9 text-sm' : 'h-10 text-sm';

  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      {/* Breadcrumb: shows the cascade visually so the user sees what
          they've narrowed to. Hidden when nothing is picked yet. */}
      {(value.districtName || value.settlementName) && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {value.districtName && (
            <Crumb icon={Layers} label={value.districtName} />
          )}
          {value.settlementName && (
            <>
              <ChevronLeft className="h-3 w-3" />
              <Crumb icon={Building2} label={value.settlementName} />
            </>
          )}
          {value.neighborhoodName && (
            <>
              <ChevronLeft className="h-3 w-3" />
              <Crumb icon={MapPin} label={value.neighborhoodName} />
            </>
          )}
          {value.streetName && (
            <>
              <ChevronLeft className="h-3 w-3" />
              <Crumb icon={MapPin} label={value.streetName} accent />
            </>
          )}
        </div>
      )}

      <div className={`grid gap-3 ${gridColsFor(showNeighborhood, showStreet)}`}>
        <Field label="מחוז" icon={Layers} loading={loadingDistricts}>
          <select
            value={value.districtId ?? ''}
            onChange={(e) => pickDistrict(e.target.value)}
            className={`w-full rounded-md border bg-background px-3 ${fieldHeight} focus:outline-none focus:ring-2 focus:ring-ring`}
          >
            <option value="">בחר מחוז</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameHe} ({d._count.settlements} ערים)
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="עיר"
          icon={Building2}
          loading={loadingSettlements}
          disabled={!value.districtId}
          disabledHint="בחר מחוז תחילה"
        >
          <select
            value={value.settlementId ?? ''}
            onChange={(e) => pickSettlement(e.target.value)}
            disabled={!value.districtId}
            className={`w-full rounded-md border bg-background px-3 ${fieldHeight} focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground`}
          >
            <option value="">
              {value.districtId ? 'בחר עיר' : 'נעול עד בחירת מחוז'}
            </option>
            {settlements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameHe}
                {s.population ? ` · ${(s.population / 1000).toFixed(0)}k` : ''}
              </option>
            ))}
          </select>
        </Field>

        {showNeighborhood && (
          <Field
            label="שכונה"
            icon={MapPin}
            loading={loadingNeighborhoods}
            disabled={!value.settlementId}
            disabledHint="בחר עיר תחילה"
            optional
          >
            <select
              value={value.neighborhoodId ?? ''}
              onChange={(e) => pickNeighborhood(e.target.value)}
              disabled={!value.settlementId}
              className={`w-full rounded-md border bg-background px-3 ${fieldHeight} focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground`}
            >
              <option value="">
                {value.settlementId
                  ? neighborhoods.length === 0 && !loadingNeighborhoods
                    ? 'אין שכונות לעיר זו'
                    : 'כל השכונות'
                  : 'נעול עד בחירת עיר'}
              </option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nameHe}
                </option>
              ))}
            </select>
          </Field>
        )}

        {showStreet && (
          <Field
            label="רחוב"
            icon={MapPin}
            loading={loadingStreets}
            disabled={!value.settlementId}
            disabledHint="בחר עיר תחילה"
            optional
          >
            <select
              value={value.streetId ?? ''}
              onChange={(e) => pickStreet(e.target.value)}
              disabled={!value.settlementId}
              className={`w-full rounded-md border bg-background px-3 ${fieldHeight} focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground`}
            >
              <option value="">
                {value.settlementId
                  ? streets.length === 0 && !loadingStreets
                    ? 'אין רחובות בנתונים'
                    : 'כל הרחובות'
                  : 'נעול עד בחירת עיר'}
              </option>
              {streets.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.nameHe}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}

// ─── Internals ─────────────────────────────────────────────────────

function gridColsFor(showNeighborhood: boolean, showStreet: boolean) {
  // 4 levels → 2x2 on small, 4 cols on md+. Shrink when steps hidden.
  const cols = 2 + (showNeighborhood ? 1 : 0) + (showStreet ? 1 : 0);
  if (cols === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (cols === 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
}

function Field({
  label,
  icon: Icon,
  children,
  loading,
  disabled,
  disabledHint,
  optional,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {optional && (
          <span className="text-[10px] font-normal text-muted-foreground">
            (אפשר לדלג)
          </span>
        )}
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </Label>
      {children}
      {disabled && disabledHint && (
        <p className="text-[10px] text-muted-foreground">{disabledHint}</p>
      )}
    </div>
  );
}

function Crumb({
  icon: Icon,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={
        accent
          ? 'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary'
          : 'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5'
      }
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
