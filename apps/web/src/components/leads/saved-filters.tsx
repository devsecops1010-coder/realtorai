'use client';

// Saved filters chip-bar. Lets the user bookmark the current URL filter
// state under a friendly name and re-apply with one click.
//
// Storage: localStorage (per-user, per-device). We *don't* sync to the
// server because:
//   - Filter sets are user-specific UX state, not business data.
//   - Sync would require an extra schema + auth context to read.
//   - localStorage is good enough for v1; we can add server sync later
//     behind the same component contract.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bookmark, BookmarkPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'rai_saved_filters_v1';

interface SavedFilter {
  name: string;
  // The full search-string (no leading '?') of the URL at save time.
  params: string;
}

function readAll(): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: SavedFilter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function SavedFilters() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  // Hydrate from localStorage on mount. We can't do this in initial state
  // because Next renders the page on the server first and `window` would
  // be undefined.
  useEffect(() => {
    setFilters(readAll());
  }, []);

  // The current URL params, sans `view` (view toggle is independent of the
  // "filter" abstraction — a saved Kanban-with-status=hot is still about
  // the hot-status filter).
  const current = (() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('view');
    return p.toString();
  })();

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (filters.some((f) => f.name === trimmed)) {
      toast.error('שם כבר קיים');
      return;
    }
    const next = [...filters, { name: trimmed, params: current }];
    writeAll(next);
    setFilters(next);
    setName('');
    setAdding(false);
    toast.success('הפילטר נשמר');
  }

  function remove(name: string) {
    const next = filters.filter((f) => f.name !== name);
    writeAll(next);
    setFilters(next);
  }

  // Don't render the chips bar at all if there's nothing saved AND the user
  // isn't actively saving — keeps the leads page header tidy.
  if (filters.length === 0 && !adding && !current) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.length > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Bookmark className="h-3.5 w-3.5" /> מסננים שמורים:
        </span>
      )}
      {filters.map((f) => (
        <span
          key={f.name}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/50 pl-1.5 pr-2.5 py-0.5 text-xs"
        >
          <Link
            href={`/leads${f.params ? `?${f.params}` : ''}`}
            className="hover:underline"
          >
            {f.name}
          </Link>
          <button
            type="button"
            onClick={() => remove(f.name)}
            className="text-muted-foreground hover:text-destructive p-0.5"
            aria-label="הסר"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {/* Save current filter — only enabled when there *is* an active
          filter to bookmark. */}
      {current && !adding && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => setAdding(true)}
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          שמור מסנן
        </Button>
      )}
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="inline-flex items-center gap-1"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם המסנן..."
            className="h-7 rounded-md border bg-background px-2 text-xs w-32"
          />
          <Button size="sm" type="submit" className="h-7 text-xs">
            שמור
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            className="h-7 text-xs"
            onClick={() => {
              setAdding(false);
              setName('');
            }}
          >
            ביטול
          </Button>
        </form>
      )}
    </div>
  );
}
