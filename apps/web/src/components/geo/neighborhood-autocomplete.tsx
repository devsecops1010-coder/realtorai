'use client';

/**
 * Neighborhood (שכונה) autocomplete — sibling of street/city pickers.
 *
 * Disabled until a settlement is picked (neighborhoods are scoped to a
 * city in our data model). Empty result is normal — we've only curated
 * neighborhoods for ~25 of the 1,306 settlements, and the picker should
 * silently degrade rather than show a scary error.
 *
 * Why a separate component instead of just a `<select>`: most cities
 * have 5-20 neighborhoods (Tel Aviv 20, Jerusalem 15) — small enough
 * for a dropdown but large enough that arrow-key + type-to-filter is
 * meaningfully faster than scrolling. Same UX shape as CityAutocomplete
 * so the form feels uniform.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface Neighborhood {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string | null;
  latitude: number | null;
  longitude: number | null;
}

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

export function NeighborhoodAutocomplete({
  value,
  onChange,
  onSelectNeighborhood,
  settlementId,
  placeholder = 'חפש שכונה...',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectNeighborhood?: (n: Neighborhood) => void;
  settlementId: string | null | undefined;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Neighborhood[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = useCallback(async (q: string) => {
    if (!settlementId) return;
    setLoading(true);
    try {
      const url = `${API}/geo/neighborhoods?settlementId=${settlementId}${q ? `&q=${encodeURIComponent(q)}` : ''}&take=60`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as Neighborhood[];
      setItems(data);
      setActiveIdx(data.length > 0 ? 0 : -1);
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchItems(value);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, open, fetchItems]);

  // Reset on city change — the old neighborhood is scoped to a city
  // that's no longer selected.
  useEffect(() => {
    setItems([]);
    setOpen(false);
  }, [settlementId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(n: Neighborhood) {
    onChange(n.nameHe);
    onSelectNeighborhood?.(n);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!settlementId) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true); fetchItems(value); e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIdx((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && activeIdx >= 0 && items[activeIdx]) {
      pick(items[activeIdx]);
      e.preventDefault();
    }
  }

  const disabled = !settlementId;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { if (!disabled) { setOpen(true); fetchItems(value); } }}
          onKeyDown={onKeyDown}
          placeholder={disabled ? 'בחר עיר תחילה' : placeholder}
          autoComplete="off"
          className="w-full h-10 rounded-md border bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && !disabled && (items.length > 0 || loading) && (
        <ul
          className="absolute top-full right-0 z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-lift py-1"
          role="listbox"
        >
          {items.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {/* Neighborhood data is curated; many cities will have nothing
                  yet. Keep the message soft — this isn't an error. */}
              אין שכונות זמינות לעיר זו
            </li>
          )}
          {items.map((n, i) => (
            <li
              key={n.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); pick(n); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              {n.nameHe}
              {n.nameEn && <span className="ml-2 text-xs text-muted-foreground">({n.nameEn})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
