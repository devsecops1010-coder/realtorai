'use client';

/**
 * Street autocomplete — sibling of `CityAutocomplete`. Disabled until a
 * settlement is chosen (streets are scoped to a city in the CBS data),
 * so the parent must pass `settlementId`. When that changes the input
 * resets — picking a new city should always clear the street.
 *
 * Same hand-rolled combobox approach as `CityAutocomplete` so the two
 * fields feel identical.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface Street {
  id: string;
  code: number;
  nameHe: string;
  nameEn: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '/api';

export function StreetAutocomplete({
  value,
  onChange,
  onSelectStreet,
  settlementId,
  placeholder = 'חפש רחוב...',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectStreet?: (street: Street) => void;
  settlementId: string | null | undefined;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Street[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStreets = useCallback(async (q: string) => {
    if (!settlementId) return;
    setLoading(true);
    try {
      const url = `${API}/geo/streets?settlementId=${settlementId}${q ? `&q=${encodeURIComponent(q)}` : ''}&take=30`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as Street[];
      setItems(data);
      setActiveIdx(data.length > 0 ? 0 : -1);
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchStreets(value);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, open, fetchStreets]);

  // Reset on city change — the previous street probably doesn't exist
  // in the new city, and even if it does the streetId would be stale.
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

  function pick(s: Street) {
    onChange(s.nameHe);
    onSelectStreet?.(s);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!settlementId) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true); fetchStreets(value); e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { setActiveIdx((i) => Math.min(i + 1, items.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setActiveIdx((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter' && activeIdx >= 0 && items[activeIdx]) { pick(items[activeIdx]); e.preventDefault(); }
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
          onFocus={() => { if (!disabled) { setOpen(true); fetchStreets(value); } }}
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
            <li className="px-3 py-2 text-sm text-muted-foreground">אין תוצאות</li>
          )}
          {items.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              {s.nameHe}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
