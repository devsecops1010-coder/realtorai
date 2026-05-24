'use client';

/**
 * Hero-styled search autocomplete. Replaces the previous static "חפש"
 * link on the landing page so visitors can pick a city/street directly
 * from the hero and land on a pre-filtered marketplace.
 *
 * Two suggestion sources, blended in one dropdown:
 *   - Settlements (cities/towns)  → /marketplace?city=<nameHe>
 *   - Streets                     → /marketplace?city=<parent>&q=<street>
 *
 * Both come from /geo/search, which already returns the matching
 * settlements + streets in one round-trip.
 *
 * Why not reuse `CityAutocomplete`: the hero needs a tab strip,
 * "Filters"/"Search now" buttons, and a different size + colour. The
 * shared field would force too many props; a hero-specific component
 * stays simpler.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

const SEARCH_TABS = ['קנייה', 'השכרה', 'דירות חדשות', 'מסחרי'] as const;
const CITY_CHIPS = ['הרצליה', 'תל אביב', 'ירושלים', 'חיפה', 'רמת גן'];

// Each tab maps to a `dealType` filter on /marketplace. "דירות חדשות"
// and "מסחרי" aren't separate enums in the schema yet — we treat them
// as "sale" filters until a richer property type lands.
const TAB_TO_DEAL: Record<(typeof SEARCH_TABS)[number], string> = {
  קנייה: 'sale',
  השכרה: 'rent',
  'דירות חדשות': 'sale',
  מסחרי: 'sale',
};

interface SearchResult {
  settlements: Array<{
    id: string;
    nameHe: string;
    nameEn: string | null;
    population: number | null;
  }>;
  streets: Array<{
    id: string;
    nameHe: string;
    settlement: { id: string; nameHe: string };
  }>;
}

export function HeroSearchAutocomplete() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tab, setTab] = useState<(typeof SEARCH_TABS)[number]>('קנייה');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({ settlements: [], streets: [] });
  // A flat list of all items so arrow-keys can navigate across both
  // settlements and streets seamlessly.
  const [activeIdx, setActiveIdx] = useState(-1);

  const flat = [
    ...results.settlements.map((s) => ({ kind: 'settlement' as const, item: s })),
    ...results.streets.map((s) => ({ kind: 'street' as const, item: s })),
  ];

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults({ settlements: [], streets: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(q)}&take=6`);
      if (!res.ok) return;
      const data = (await res.json()) as SearchResult;
      setResults(data);
      setActiveIdx(data.settlements.length + data.streets.length > 0 ? 0 : -1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchResults(query);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, fetchResults]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function buildHref(opts: { city?: string; q?: string }) {
    // Always include the tab → dealType. Empty values are dropped so we
    // don't pollute the URL with ?city= when no city is set.
    const params = new URLSearchParams();
    const dealType = TAB_TO_DEAL[tab];
    if (dealType) params.set('dealType', dealType);
    if (opts.city) params.set('city', opts.city);
    if (opts.q) params.set('q', opts.q);
    return `/marketplace?${params.toString()}`;
  }

  function pickSettlement(s: SearchResult['settlements'][number]) {
    router.push(buildHref({ city: s.nameHe }));
    setOpen(false);
  }
  function pickStreet(s: SearchResult['streets'][number]) {
    router.push(buildHref({ city: s.settlement.nameHe, q: s.nameHe }));
    setOpen(false);
  }
  function pickFromActive() {
    const a = flat[activeIdx];
    if (!a) return;
    if (a.kind === 'settlement') pickSettlement(a.item);
    else pickStreet(a.item);
  }
  function searchNow() {
    // If the user typed text but didn't pick, send them to a free-text
    // marketplace search so they always get *somewhere*.
    if (query.trim()) router.push(buildHref({ q: query.trim() }));
    else router.push(buildHref({}));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        fetchResults(query);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIdx((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && flat[activeIdx]) pickFromActive();
      else searchNow();
      e.preventDefault();
    }
  }

  return (
    <div ref={wrapperRef} className="rounded-lg border bg-card p-4 shadow-lift">
      <div className="mb-4 flex flex-wrap gap-2">
        {SEARCH_TABS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={
              tab === label
                ? 'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground'
                : 'rounded-md border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => {
                setOpen(true);
                if (query.length >= 2) fetchResults(query);
              }}
              onKeyDown={onKeyDown}
              placeholder="חפש עיר, שכונה, רחוב או נכס"
              autoComplete="off"
              className="h-12 w-full rounded-md border bg-background pr-10 pl-3 text-right text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {loading && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button asChild variant="outline" className="h-12">
            <Link href="/#marketplace">
              <SlidersHorizontal className="h-4 w-4" />
              פילטרים
            </Link>
          </Button>
          <Button type="button" variant="gradient" className="btn-shine h-12" onClick={searchNow}>
            חפש עכשיו
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {open && (loading || flat.length > 0 || query.trim().length >= 2) && (
          <div
            className="absolute top-full right-0 z-30 mt-2 w-full md:w-[calc(100%-15rem)] max-h-[24rem] overflow-y-auto rounded-md border bg-popover shadow-lift"
            role="listbox"
          >
            {loading && flat.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted-foreground">מחפש...</div>
            )}
            {!loading && flat.length === 0 && query.trim().length >= 2 && (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                אין תוצאות. נסה לחפש לפי עיר או רחוב.
              </div>
            )}

            {results.settlements.length > 0 && (
              <div>
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                  ערים
                </p>
                <ul>
                  {results.settlements.map((s, i) => {
                    const idx = i;
                    return (
                      <li
                        key={s.id}
                        role="option"
                        aria-selected={idx === activeIdx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickSettlement(s);
                        }}
                        className={`flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer ${
                          idx === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <span className="font-medium">{s.nameHe}</span>
                        </span>
                        {s.population && (
                          <span className="text-xs text-muted-foreground">
                            {(s.population / 1000).toFixed(0)}k תושבים
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {results.streets.length > 0 && (
              <div>
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                  רחובות
                </p>
                <ul>
                  {results.streets.map((s, i) => {
                    const idx = results.settlements.length + i;
                    return (
                      <li
                        key={s.id}
                        role="option"
                        aria-selected={idx === activeIdx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickStreet(s);
                        }}
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

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {CITY_CHIPS.map((city) => (
          <Link
            key={city}
            href={buildHref({ city })}
            className="rounded-full border bg-background px-3 py-1 text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            {city}
          </Link>
        ))}
      </div>
    </div>
  );
}
