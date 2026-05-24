'use client';

/**
 * Marketplace "חיפוש חופשי" autocomplete — smart variant that suggests
 * settlements + streets as the user types, blended in one dropdown.
 *
 * Behaviour rules:
 *   - With no `city` filter set → suggestions are global (any city,
 *     any street). Picking a settlement fills the city filter; picking
 *     a street fills both city + q.
 *   - With a `city` filter set → suggestions are narrowed to streets
 *     in that city (client-side filter on the /geo/search result).
 *     This addresses the common flow "I picked לוד, now show me streets
 *     in לוד as I type שלמה".
 *
 * Replaces the previous plain `<input>` so the operator doesn't have
 * to remember the exact spelling of a Hebrew street name. Falls back
 * to the typed text if no suggestion is picked — the marketplace's
 * free-text `q` filter still works for "תיאור" matches.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
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

export function MarketSearchAutocomplete({
  value,
  city,
  onChange,
  onSelectCity,
  onSelectStreet,
  placeholder = 'עיר, שכונה, רחוב או תיאור',
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
  const [results, setResults] = useState<SearchResult>({ settlements: [], streets: [] });
  const [activeIdx, setActiveIdx] = useState(-1);

  // ── Scoped suggestions ────────────────────────────────────────
  // When the user already picked a city, drop settlements from the
  // results entirely (they don't want to switch city while drilling
  // into streets) and filter streets to that city. The normalise step
  // strips diacritics/spaces/dashes so "תל אביב יפו" matches
  // "תל אביב - יפו" (CBS uses both).
  const filtered: SearchResult = (() => {
    if (!city) return results;
    const norm = (s: string) =>
      s.replace(/\s+/g, '').replace(/[-–—־'"׳״]/g, '').toLowerCase();
    const cityKey = norm(city);
    return {
      settlements: [],
      streets: results.streets.filter((st) => norm(st.settlement.nameHe).includes(cityKey)),
    };
  })();

  const flat = [
    ...filtered.settlements.map((s) => ({ kind: 'settlement' as const, item: s })),
    ...filtered.streets.map((s) => ({ kind: 'street' as const, item: s })),
  ];

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults({ settlements: [], streets: [] });
      return;
    }
    setLoading(true);
    try {
      // Bigger `take` when scoped — the city filter throws away most
      // results, so we need more raw matches to end up with anything
      // useful. With no city we stay tighter to keep the dropdown short.
      const take = city ? 30 : 8;
      const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(q)}&take=${take}`);
      if (!res.ok) return;
      const data = (await res.json()) as SearchResult;
      setResults(data);
      setActiveIdx(data.settlements.length + data.streets.length > 0 ? 0 : -1);
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

  // City change → re-fetch with the new scope so the dropdown reflects
  // the new constraint immediately.
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

  function pickSettlement(s: SearchResult['settlements'][number]) {
    onSelectCity(s.nameHe);
    onChange(''); // clear free-text once city is picked
    setOpen(false);
    inputRef.current?.blur();
  }
  function pickStreet(s: SearchResult['streets'][number]) {
    onSelectStreet(s.nameHe, s.settlement.nameHe);
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
              {city ? `אין רחוב כזה ב${city}` : 'אין תוצאות'}
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
