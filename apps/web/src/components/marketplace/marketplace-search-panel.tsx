'use client';

/**
 * Unified marketplace search panel — replaces the old form+chips+
 * autocomplete soup with a single coherent component.
 *
 * UX shape (mirrors yad2 / mashcantaman but Hebrew-native):
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  [🔍 חפש עיר, רחוב או נכס...                       ] │
 *   │  ┌─ suggestions dropdown ──────────────┐            │
 *   │  │ ערים: לוד · לוד-יפו                  │            │
 *   │  │ רחובות: הרצל (לוד) · הרצל (אשדוד)   │            │
 *   │  └─────────────────────────────────────┘            │
 *   │                                                      │
 *   │  [מכירה] [השכרה] [הכל]    [3+ חדרים] [4+] [5+]      │
 *   │  [עד 2M] [עד 3M] [עד 4M] [עד 6M] [וכו']            │
 *   │                                                      │
 *   │  [⌄ חיפוש מדורג לפי מחוז]  [נקה הכל]               │
 *   └─────────────────────────────────────────────────────┘
 *
 * Key behaviour:
 *   - Live search: any filter change triggers a debounced re-fetch
 *     (350 ms). No "סנן" button needed — results follow the user.
 *   - Single smart input handles: plain ("הרצל"), compound ("לוד הרצל"),
 *     comma ("לוד, הרצל"). Hebrew spelling tolerance comes from the
 *     API's variant expansion.
 *   - Picks update the filter chips below visually so the user always
 *     sees what's being filtered.
 *   - Advanced panel (hierarchical drill-down) is collapsible and
 *     streams its picks into the same filter state.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Home,
  Layers,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HierarchicalSearch,
  EMPTY_HIERARCHICAL_SEARCH,
  type HierarchicalSearchValue,
} from '@/components/geo/hierarchical-search';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

// ─── Public types ──────────────────────────────────────────────────

export type DealType = 'sale' | 'rent' | '';

export interface MarketFilters {
  q: string;
  dealType: DealType;
  city: string;
  /** Settlement UUID once a city is picked from the dropdown — kept
   *  alongside `city` for scoped street search. */
  settlementId: string | null;
  maxPrice: string;
  minRooms: string;
}

export const EMPTY_FILTERS: MarketFilters = {
  q: '',
  dealType: '',
  city: '',
  settlementId: null,
  maxPrice: '',
  minRooms: '',
};

// ─── Internal types ────────────────────────────────────────────────

interface SettlementHit {
  id: string;
  nameHe: string;
  district: { id: string; nameHe: string };
}

interface StreetHit {
  id: string;
  nameHe: string;
  settlement: { id: string; nameHe: string };
}

interface SearchHits {
  settlements: SettlementHit[];
  streets: StreetHit[];
}

const QUICK_ROOMS = [
  { value: '3', label: '3+ חדרים' },
  { value: '4', label: '4+ חדרים' },
  { value: '5', label: '5+ חדרים' },
];

const QUICK_PRICES = [
  { value: '2000000', label: 'עד 2M' },
  { value: '3000000', label: 'עד 3M' },
  { value: '4000000', label: 'עד 4M' },
  { value: '6000000', label: 'עד 6M' },
];

// ─── Component ─────────────────────────────────────────────────────

export function MarketplaceSearchPanel({
  initial,
  onChange,
}: {
  initial: MarketFilters;
  /** Fired (debounced) whenever any filter changes. The parent
   *  reloads its property list in response. */
  onChange: (next: MarketFilters) => void;
}) {
  const [filters, setFilters] = useState<MarketFilters>(initial);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<HierarchicalSearchValue>(EMPTY_HIERARCHICAL_SEARCH);

  // Debounce the upstream notification so typing in the search field
  // doesn't trigger a fetch on every keystroke. 350ms matches what
  // most users perceive as "instant" without hammering the API.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const t = setTimeout(() => onChangeRef.current(filters), 350);
    return () => clearTimeout(t);
  }, [filters]);

  // ── Patchers ────────────────────────────────────────────────────

  function patch(p: Partial<MarketFilters>) {
    setFilters((prev) => ({ ...prev, ...p }));
  }

  function pickCity(city: { nameHe: string; id: string }) {
    patch({ city: city.nameHe, settlementId: city.id, q: '' });
  }

  function pickStreet(street: { nameHe: string; settlement: { id: string; nameHe: string } }) {
    patch({
      city: street.settlement.nameHe,
      settlementId: street.settlement.id,
      q: street.nameHe,
    });
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
    setAdvanced(EMPTY_HIERARCHICAL_SEARCH);
  }

  function applyAdvanced() {
    if (!advanced.settlementId) return;
    patch({
      city: advanced.settlementName ?? filters.city,
      settlementId: advanced.settlementId,
      q: advanced.streetName ?? advanced.neighborhoodName ?? '',
    });
    setAdvancedOpen(false);
  }

  // ── Active filter chips (visible badges) ───────────────────────

  const activeChips = useMemo(() => {
    const chips: { key: keyof MarketFilters | 'reset'; label: string; onClear: () => void }[] = [];
    if (filters.dealType) {
      chips.push({
        key: 'dealType',
        label: filters.dealType === 'sale' ? 'מכירה' : 'השכרה',
        onClear: () => patch({ dealType: '' }),
      });
    }
    if (filters.city) {
      chips.push({
        key: 'city',
        label: filters.city,
        onClear: () => patch({ city: '', settlementId: null }),
      });
    }
    if (filters.q) {
      chips.push({
        key: 'q',
        label: `"${filters.q}"`,
        onClear: () => patch({ q: '' }),
      });
    }
    if (filters.minRooms) {
      chips.push({
        key: 'minRooms',
        label: `${filters.minRooms}+ חדרים`,
        onClear: () => patch({ minRooms: '' }),
      });
    }
    if (filters.maxPrice) {
      chips.push({
        key: 'maxPrice',
        label: `עד ${formatShortPrice(Number(filters.maxPrice))}`,
        onClear: () => patch({ maxPrice: '' }),
      });
    }
    return chips;
  }, [filters]);

  const advancedHasSelection = Boolean(
    advanced.districtId || advanced.settlementId || advanced.neighborhoodId || advanced.streetId,
  );

  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft md:p-5">
      {/* Big smart input */}
      <SmartSearchInput
        value={filters.q}
        cityName={filters.city}
        settlementId={filters.settlementId}
        onTypeQuery={(v) => patch({ q: v })}
        onPickCity={pickCity}
        onPickStreet={pickStreet}
        onClearCity={() => patch({ city: '', settlementId: null })}
      />

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              {chip.label}
              <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            נקה הכל
          </button>
        </div>
      )}

      {/* Deal type + quick filter chips */}
      <div className="mt-4 space-y-3">
        <ChipRow>
          <Chip
            active={filters.dealType === ''}
            onClick={() => patch({ dealType: '' })}
          >הכל</Chip>
          <Chip
            active={filters.dealType === 'sale'}
            onClick={() => patch({ dealType: 'sale' })}
          >מכירה</Chip>
          <Chip
            active={filters.dealType === 'rent'}
            onClick={() => patch({ dealType: 'rent' })}
          >השכרה</Chip>
        </ChipRow>

        <ChipRow label="חדרים">
          {QUICK_ROOMS.map((r) => (
            <Chip
              key={r.value}
              active={filters.minRooms === r.value}
              onClick={() =>
                patch({ minRooms: filters.minRooms === r.value ? '' : r.value })
              }
            >
              {r.label}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow label="מחיר">
          {QUICK_PRICES.map((p) => (
            <Chip
              key={p.value}
              active={filters.maxPrice === p.value}
              onClick={() =>
                patch({ maxPrice: filters.maxPrice === p.value ? '' : p.value })
              }
            >
              {p.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {/* Advanced (hierarchical) panel toggle */}
      <div className="mt-4 border-t pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
        >
          <Layers className="h-4 w-4" />
          חיפוש מתקדם לפי מחוז ושכונה
          {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {advancedOpen && (
          <div className="mt-3 rounded-lg border bg-background/60 p-4">
            <HierarchicalSearch value={advanced} onChange={setAdvanced} size="compact" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                בחר מחוז ועיר, אופציונלית שכונה / רחוב.
              </p>
              <div className="flex gap-2">
                {advancedHasSelection && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdvanced(EMPTY_HIERARCHICAL_SEARCH)}
                  >
                    נקה
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="gradient"
                  disabled={!advanced.settlementId}
                  onClick={applyAdvanced}
                >
                  החל
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Smart search input + dropdown ─────────────────────────────────

/**
 * The "one big search bar" — the heart of the new UX.
 *
 * - Searches settlements + streets in one /geo/search round-trip.
 * - Splits "city, street" or "city street" compounds and resolves
 *   the city against /geo/settlements, then narrows streets.
 * - Renders a fixed-position dropdown OUTSIDE the search card so
 *   no parent's overflow/transform can clip it (this was a likely
 *   cause of "dropdown לא נפתח בכלל" reports).
 */
function SmartSearchInput({
  value,
  cityName,
  settlementId,
  onTypeQuery,
  onPickCity,
  onPickStreet,
  onClearCity,
}: {
  value: string;
  cityName: string;
  settlementId: string | null;
  onTypeQuery: (v: string) => void;
  onPickCity: (s: { id: string; nameHe: string }) => void;
  onPickStreet: (s: { nameHe: string; settlement: { id: string; nameHe: string } }) => void;
  onClearCity: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHits>({ settlements: [], streets: [] });
  const [activeIdx, setActiveIdx] = useState(-1);

  // Inline editable text — combine "what's typed" with "what's
  // committed". The input displays whichever the user is currently
  // editing. When they pick a result we update both `value` (free
  // text q) and `cityName` via the parent.
  const [text, setText] = useState(value);
  // Sync when external value changes (e.g. another component reset).
  useEffect(() => {
    setText(value);
  }, [value]);

  // ── Fetcher ────────────────────────────────────────────────────
  const fetchHits = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length < 2 && !settlementId) {
      setHits({ settlements: [], streets: [] });
      return;
    }
    setLoading(true);
    try {
      // Compound detection — anything with comma / · / slash is a
      // "city, query" pattern. Split and resolve city → settlementId
      // first, then search streets in that city.
      const split = trimmed.match(/^([^,·/]+)\s*[,·/]\s*(.*)$/);
      const cityPart = split?.[1]?.trim();
      const queryPart = (split?.[2] ?? trimmed).trim();

      // Pick the effective scope: explicit settlementId > compound
      // city prefix > nothing.
      let scopeId = settlementId;
      let scopeName: string | null = cityName || null;

      if (cityPart) {
        const res = await fetch(`${API}/geo/settlements?q=${encodeURIComponent(cityPart)}&take=5`);
        if (res.ok) {
          const cities: Array<{ id: string; nameHe: string; district: { id: string; nameHe: string } }> =
            await res.json();
          const exact = cities.find((c) => normalize(c.nameHe) === normalize(cityPart));
          const best = exact ?? cities[0];
          if (best) {
            scopeId = best.id;
            scopeName = best.nameHe;
          }
        }
      }

      // If we have a scope, fetch streets in that scope. Otherwise
      // do a global search.
      if (scopeId && queryPart.length > 0) {
        const [streetsRes, settlementsRes] = await Promise.all([
          fetch(`${API}/geo/streets?settlementId=${scopeId}&q=${encodeURIComponent(queryPart)}&take=20`),
          // Always also try a global settlements search so the user
          // can switch city mid-flow if they want.
          fetch(`${API}/geo/settlements?q=${encodeURIComponent(queryPart)}&take=4`),
        ]);
        const streets = streetsRes.ok ? await streetsRes.json() : [];
        const settlements = settlementsRes.ok ? await settlementsRes.json() : [];
        setHits({
          settlements,
          streets: streets.map((s: { id: string; nameHe: string }) => ({
            id: s.id,
            nameHe: s.nameHe,
            settlement: { id: scopeId!, nameHe: scopeName ?? '' },
          })),
        });
      } else if (scopeId && queryPart.length === 0) {
        // User typed "city," and stopped — show only that city as
        // the pickable lock-in option.
        setHits({
          settlements: scopeName ? [{ id: scopeId, nameHe: scopeName, district: { id: '', nameHe: '' } }] : [],
          streets: [],
        });
      } else {
        const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(trimmed)}&take=10`);
        if (!res.ok) return;
        const data: SearchHits = await res.json();
        setHits(data);
      }

      const flat = (hits.settlements?.length ?? 0) + (hits.streets?.length ?? 0);
      setActiveIdx(flat > 0 ? 0 : -1);
    } finally {
      setLoading(false);
    }
    // hits is read inside but we don't want it as dep — re-running on
    // every fetch would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settlementId, cityName]);

  // Debounced re-fetch as user types.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchHits(text);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, open, fetchHits]);

  // Click-outside → close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // ── Pickers ─────────────────────────────────────────────────────
  function commitCity(s: { id: string; nameHe: string }) {
    onPickCity(s);
    setText('');
    setOpen(false);
    inputRef.current?.blur();
  }
  function commitStreet(s: { nameHe: string; settlement: { id: string; nameHe: string } }) {
    onPickStreet(s);
    setText(s.nameHe);
    setOpen(false);
    inputRef.current?.blur();
  }

  const flat = [
    ...hits.settlements.map((s) => ({ kind: 'settlement' as const, item: s })),
    ...hits.streets.map((s) => ({ kind: 'street' as const, item: s })),
  ];

  function pickFromActive() {
    const a = flat[activeIdx];
    if (!a) return;
    if (a.kind === 'settlement') commitCity(a.item);
    else commitStreet(a.item);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        fetchHits(text);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIdx((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && activeIdx >= 0 && flat[activeIdx]) {
      pickFromActive();
      e.preventDefault();
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} className="relative">
      {/* Pre-bar context: when a city is committed, show it as a
          removable chip at the start of the input so the user can
          see they're already scoped. */}
      <label htmlFor={inputId} className="mb-1.5 flex items-center justify-between text-sm font-medium">
        <span>חיפוש</span>
        {cityName && (
          <button
            type="button"
            onClick={onClearCity}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            נקה עיר ({cityName})
          </button>
        )}
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        {cityName && (
          <span className="absolute right-10 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Home className="h-3 w-3" />
            {cityName}
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTypeQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { setOpen(true); fetchHits(text); }}
          onKeyDown={onKeyDown}
          placeholder={
            cityName
              ? `חפש רחוב, שכונה או תיאור ב${cityName}`
              : 'חפש עיר, רחוב, שכונה או "עיר, רחוב"'
          }
          autoComplete="off"
          className="h-12 w-full rounded-md border bg-background pr-10 pl-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          style={{
            // When a city chip is shown, push the typed text past it
            // so the two don't overlap visually.
            paddingRight: cityName ? `${cityName.length * 8 + 56}px` : undefined,
          }}
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown — positioned within the wrapper, max-height + scroll
          so a long list doesn't push the page. z-50 to clear any
          sibling overlays (the map view sits at z-[1000] but it's
          not a sibling of the search form). */}
      {open && (loading || flat.length > 0 || text.trim().length >= 2 || settlementId) && (
        <div
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[26rem] overflow-y-auto rounded-md border bg-popover shadow-lift"
          role="listbox"
        >
          {loading && flat.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">מחפש...</div>
          )}

          {!loading && flat.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              {text.trim().length < 2
                ? 'התחל להקליד עיר, שכונה או רחוב'
                : `אין תוצאות ל"${text.trim()}"${cityName ? ` ב${cityName}` : ''}`}
            </div>
          )}

          {hits.settlements.length > 0 && (
            <Group label="ערים">
              {hits.settlements.map((s, i) => (
                <Row
                  key={`s-${s.id}`}
                  active={i === activeIdx}
                  onHover={() => setActiveIdx(i)}
                  onPick={() => commitCity(s)}
                  icon={<Home className="h-4 w-4 text-primary" />}
                  title={s.nameHe}
                  hint={s.district?.nameHe}
                />
              ))}
            </Group>
          )}

          {hits.streets.length > 0 && (
            <Group label="רחובות">
              {hits.streets.map((s, i) => {
                const idx = hits.settlements.length + i;
                return (
                  <Row
                    key={`st-${s.id}`}
                    active={idx === activeIdx}
                    onHover={() => setActiveIdx(idx)}
                    onPick={() => commitStreet(s)}
                    icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                    title={s.nameHe}
                    hint={s.settlement.nameHe}
                  />
                );
              })}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tiny presentational helpers ──────────────────────────────────

function ChipRow({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}:</span>}
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
          : 'rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="border-t border-border/60 px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground first:border-t-0">
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function Row({
  active,
  onHover,
  onPick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onHover: () => void;
  onPick: () => void;
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <li
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onMouseDown={(e) => { e.preventDefault(); onPick(); }}
      className={
        active
          ? 'flex cursor-pointer items-center justify-between gap-3 bg-accent px-3 py-2.5 text-sm text-accent-foreground'
          : 'flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-accent/50'
      }
    >
      <span className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </li>
  );
}

// ─── Utils ─────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.replace(/\s+/g, '').replace(/[-–—־'"׳״]/g, '').toLowerCase();
}

function formatShortPrice(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
