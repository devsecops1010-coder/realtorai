'use client';

/**
 * Lightweight city autocomplete backed by `/geo/settlements?q=...`.
 *
 * Why a hand-rolled combobox instead of headlessui/cmdk: this is the
 * one place we need it on the marketing site, and pulling in a combobox
 * lib would add ~10 kB for a single use. The hand-rolled version
 * supports: arrow-key nav, enter-to-select, click-outside-to-close,
 * Hebrew-friendly RTL alignment.
 *
 * Value model: the parent owns the *display* string (Hebrew city name).
 * `onSelectCity` fires with the full settlement object when a user
 * picks from the dropdown — the parent decides whether to store the id,
 * the name, or both. This keeps the component reusable for searches
 * (name only) and for property forms (id + name + coords).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Settlement {
  id: string;
  code: number;
  nameHe: string;
  nameEn: string | null;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  district: { id: string; nameHe: string };
  subDistrict: { id: string; nameHe: string } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

export function CityAutocomplete({
  value,
  onChange,
  onSelectCity,
  placeholder = 'חפש עיר...',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectCity?: (settlement: Settlement) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Settlement[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch settlements (top-30 by population when empty, substring search
  // when 2+ chars). Debounced 200ms — typed-fast inputs only trigger
  // one network call.
  const fetchItems = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.length >= 2
        ? `${API}/geo/settlements?q=${encodeURIComponent(q)}&take=15`
        : `${API}/geo/settlements?take=15`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as Settlement[];
      setItems(data);
      setActiveIdx(data.length > 0 ? 0 : -1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-query whenever `value` changes (the input is controlled).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchItems(value);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, open, fetchItems]);

  // Click-outside → close dropdown.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(s: Settlement) {
    onChange(s.nameHe);
    onSelectCity?.(s);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        fetchItems(value);
        e.preventDefault();
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

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); fetchItems(value); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-10 rounded-md border bg-background pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (items.length > 0 || loading) && (
        <ul
          className="absolute top-full right-0 z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-lift py-1"
          role="listbox"
        >
          {items.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-muted-foreground">אין תוצאות</li>
          )}
          {items.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              <span className="font-medium">{s.nameHe}</span>
              <span className="text-xs text-muted-foreground">
                {s.district.nameHe}
                {s.population ? ` · ${(s.population / 1000).toFixed(0)}k` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
