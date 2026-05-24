'use client';

/**
 * Marketplace "חיפוש חופשי" autocomplete — smart variant that suggests
 * settlements + streets as the user types, blended in one dropdown.
 *
 * Three input modes, all resolved transparently:
 *
 *   1. Plain query — "שלמה". Globally suggests cities + streets matching.
 *   2. Compound "city, query" — "לוד, חיסכון". Detected by comma. We
 *      look up "לוד" as a city and use "חיסכון" as a street search
 *      scoped to that city. Picking a result fills city + q properly.
 *   3. Scoped — when the sibling `city` filter is already set, the
 *      input doesn't need the city prefix. We narrow to streets in
 *      that city automatically.
 *
 * Why support mode 2: that's how Israelis naturally write addresses
 * ("תל אביב, דיזנגוף 1") and how a buyer would type their search into
 * a single search box. Without it, the user has to switch fields to
 * pick the city then come back — clunky.
 *
 * Falls back to plain free-text on submit if nothing is picked — the
 * marketplace's `q` filter still matches the `notes` column too.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Home, Loader2, MapPin, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

interface SearchResult {
  settlements: Array<{ id: string; nameHe: string }>;
  streets: Array<{
    id: string;
    nameHe: string;
    settlement: { id: string; nameHe: string };
  }>;
}

/**
 * Splits "city, street" or "city · street" into the two parts.
 * Returns `null` for the city if no separator is found.
 */
function splitCompound(input: string): { cityPart: string | null; queryPart: string } {
  const trimmed = input.trim();
  // Accept comma, Hebrew geresh, middle-dot, slash as separators —
  // covers the common formats users actually type.
  const m = trimmed.match(/^([^,·/]+)\s*[,·/]\s*(.+)$/);
  if (!m) return { cityPart: null, queryPart: trimmed };
  return { cityPart: m[1].trim(), queryPart: m[2].trim() };
}

const norm = (s: string) =>
  s.replace(/\s+/g, '').replace(/[-–—־'"׳״]/g, '').toLowerCase();

export function MarketSearchAutocomplete({
  value,
  city,
  onChange,
  onSelectCity,
  onSelectStreet,
  placeholder = 'עיר, או "עיר, רחוב" (לדוגמה: לוד, הרצל)',
  className,
}: {
  value: string;
  /** The currently picked city name (from a sibling filter). When set,
   *  street suggestions are scoped to that city. Empty string = global. */
  city: string;
  onChange: (v: string) => void;
  onSelectCity: (cityName: string) => void;
  onSelectStreet: (streetName: string, cityName: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Two parallel result buckets: one for the "city part" of a compound
  // query, one for the "query part". We blend them when rendering so
  // the dropdown still feels like a single list.
  const [results, setResults] = useState<SearchResult>({ settlements: [], streets: [] });
  /** The resolved settlement implied by the "city, street" prefix —
   *  drives the scope for the street query when the user typed a
   *  compound. Independent of the sibling `city` filter. */
  const [impliedCity, setImpliedCity] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  const parsed = useMemo(() => splitCompound(value), [value]);
  // The effective city scope is the explicit filter > the typed
  // prefix > nothing. Whichever wins, we restrict street suggestions
  // to that city.
  const scopeCity = city || impliedCity || '';

  // ── Filtering ──────────────────────────────────────────────────
  const filtered: SearchResult = (() => {
    if (!scopeCity) return results;
    const cityKey = norm(scopeCity);
    return {
      // Inside a scope we suppress settlement suggestions — the user
      // already decided on a city, switching mid-flow would lose work.
      settlements: [],
      streets: results.streets.filter((st) => norm(st.settlement.nameHe).includes(cityKey)),
    };
  })();

  const flat = [
    ...filtered.settlements.map((s) => ({ kind: 'settlement' as const, item: s })),
    ...filtered.streets.map((s) => ({ kind: 'street' as const, item: s })),
  ];

  // ── Fetcher ────────────────────────────────────────────────────
  const fetchResults = useCallback(async (raw: string) => {
    const { cityPart, queryPart } = splitCompound(raw);

    // No compound: regular search. The query has to be ≥2 chars to
    // hit the API (`/geo/search` returns empty below that anyway).
    if (!cityPart) {
      setImpliedCity(null);
      if (queryPart.length < 2) {
        setResults({ settlements: [], streets: [] });
        return;
      }
      setLoading(true);
      try {
        const take = city ? 30 : 8;
        const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(queryPart)}&take=${take}`);
        if (!res.ok) return;
        setResults(await res.json());
      } finally {
        setLoading(false);
      }
      return;
    }

    // Compound query: first resolve the city, then search streets in
    // that city. Two API calls, fired in parallel because there's no
    // dependency between them once we know the city candidate name.
    setLoading(true);
    try {
      const citiesRes = await fetch(`${API}/geo/settlements?q=${encodeURIComponent(cityPart)}&take=5`);
      const cities: Array<{ id: string; nameHe: string }> = citiesRes.ok ? await citiesRes.json() : [];
      // Pick the best city match: exact normalized match wins, else
      // first hit. If nothing matches, fall back to a global street
      // search — better than empty.
      const exact = cities.find((c) => norm(c.nameHe) === norm(cityPart));
      const best = exact ?? cities[0] ?? null;

      if (!best) {
        setImpliedCity(null);
        // No city matched at all — degrade to a global search for the
        // whole compound text so the user gets *something*.
        const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(raw)}&take=8`);
        setResults(res.ok ? await res.json() : { settlements: [], streets: [] });
        return;
      }

      setImpliedCity(best.nameHe);

      if (queryPart.length === 0) {
        // User typed "לוד," and stopped — show the city as the only
        // pickable result so they can lock it in with Enter.
        setResults({
          settlements: [best],
          streets: [],
        });
        return;
      }

      const streetsRes = await fetch(
        `${API}/geo/streets?settlementId=${best.id}&q=${encodeURIComponent(queryPart)}&take=30`,
      );
      const streets: Array<{ id: string; nameHe: string }> = streetsRes.ok ? await streetsRes.json() : [];
      setResults({
        settlements: [],
        streets: streets.map((st) => ({
          id: st.id,
          nameHe: st.nameHe,
          settlement: { id: best.id, nameHe: best.nameHe },
        })),
      });
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchResults(value);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, open, fetchResults]);

  // External city change → re-fetch with new scope so the dropdown
  // reflects the new constraint immediately.
  useEffect(() => {
    if (open && value.trim().length >= 2) fetchResults(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // ── Pickers ─────────────────────────────────────────────────────
  function pickSettlement(s: SearchResult['settlements'][number]) {
    onSelectCity(s.nameHe);
    onChange(''); // clear free-text once city is locked into its own field
    setImpliedCity(null);
    setOpen(false);
    inputRef.current?.blur();
  }
  function pickStreet(s: SearchResult['streets'][number]) {
    onSelectStreet(s.nameHe, s.settlement.nameHe);
    // Replace the typed text with just the street name so the field
    // reads like the picked result ("חיסכון") and city goes into
    // its own filter. No more "לוד, חיסכון" residue.
    onChange(s.nameHe);
    setImpliedCity(null);
    setOpen(false);
    inputRef.current?.blur();
  }
  function pickFromActive() {
    const a = flat[activeIdx];
    if (!a) return;
    if (a.kind === 'settlement') pickSettlement(a.item);
    else pickStreet(a.item);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        fetchResults(value);
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
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && flat[activeIdx]) {
        pickFromActive();
        e.preventDefault();
      }
      // Otherwise let the parent form submit (Enter = "Search now").
    }
  }

  // Show a hint chip when we've resolved a city from a compound query
  // but the user hasn't picked yet — gives confidence that the typed
  // prefix is understood as a scope, not just gibberish.
  const showImpliedHint = impliedCity && impliedCity !== city && parsed.cityPart;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (value.trim().length >= 2) fetchResults(value);
          }}
          onKeyDown={onKeyDown}
          placeholder={city ? `חפש רחוב ב${city}` : placeholder}
          autoComplete="off"
          className="h-10 w-full rounded-md border bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showImpliedHint && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          מחפש ב<span className="font-semibold text-primary">{impliedCity}</span>.
          בחר מהרשימה כדי לאכלס את שדה העיר.
        </p>
      )}

      {open && (loading || flat.length > 0 || value.trim().length >= 2) && (
        <div
          className="absolute top-full right-0 z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-lift"
          role="listbox"
        >
          {loading && flat.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">מחפש...</div>
          )}
          {!loading && flat.length === 0 && value.trim().length >= 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {scopeCity ? `אין רחוב כזה ב${scopeCity}` : 'אין תוצאות'}
            </div>
          )}

          {filtered.settlements.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                ערים
              </p>
              <ul>
                {filtered.settlements.map((s, i) => (
                  <li
                    key={s.id}
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseDown={(e) => { e.preventDefault(); pickSettlement(s); }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                      i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                  >
                    <Home className="h-4 w-4 text-primary" />
                    <span className="font-medium">{s.nameHe}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filtered.streets.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                רחובות
              </p>
              <ul>
                {filtered.streets.map((s, i) => {
                  const idx = filtered.settlements.length + i;
                  return (
                    <li
                      key={s.id}
                      role="option"
                      aria-selected={idx === activeIdx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => { e.preventDefault(); pickStreet(s); }}
                      className={`flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer ${
                        idx === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium">{s.nameHe}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{s.settlement.nameHe}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
