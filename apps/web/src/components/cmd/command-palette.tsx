'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Users,
  Building,
  ListTodo,
  MessageSquare,
  Bell,
  Home,
  Banknote,
  Shield,
  Building2,
  UsersRound,
  ScrollText,
  Megaphone,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  roles?: UserRole[]; // when set, only these roles see the item
}

const NAV: NavItem[] = [
  { href: '/dashboard',        label: 'דשבורד',        icon: Home,           hint: 'g d' },
  { href: '/leads',            label: 'לידים',          icon: Users,          hint: 'g l' },
  { href: '/leads/new',        label: 'ליד חדש',        icon: Users,          hint: 'n l' },
  { href: '/properties',       label: 'נכסים',          icon: Building,       hint: 'g p' },
  { href: '/properties/new',   label: 'נכס חדש',        icon: Building,       hint: 'n p' },
  { href: '/mortgage',         label: 'משכנתאות',       icon: Banknote },
  { href: '/tasks',            label: 'משימות',         icon: ListTodo,       hint: 'g t' },
  { href: '/conversations',    label: 'שיחות',          icon: MessageSquare,  hint: 'g c' },
  { href: '/notifications',    label: 'התראות',         icon: Bell },
  { href: '/team',             label: 'צוות והרשאות',   icon: UsersRound },
  { href: '/team/permissions', label: 'מטריצת הרשאות',   icon: UsersRound },
  { href: '/audit',            label: 'יומן ביקורת',    icon: ScrollText },
  { href: '/office',           label: 'המשרד שלי',      icon: Building2 },
  { href: '/growth',           label: 'צמיחה ושיווק',   icon: Megaphone },
  { href: '/admin',            label: 'אדמין פלטפורמה',  icon: Shield,
    roles: ['platform_admin', 'platform_owner'] },
];

interface SearchResult {
  type: 'lead' | 'property' | 'task' | 'conversation' | 'user';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/**
 * Global ⌘K / Ctrl+K command palette. Two sections:
 *   - Navigation — quick jump to any page.
 *   - Search — types 3+ chars, debounced API search across leads/properties.
 *
 * Mounted once in (protected)/layout so it's available on every authed page.
 * Keyboard shortcuts handled here, not at document level, so the palette
 * doesn't conflict with /login or marketing pages.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const me = getCurrentUser();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K toggle. Captured at the document level so an open modal
  // (or any focused input) still gets the shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search. 2+ chars (the unified search enforces min length on
  // its side, but we don't fire below 2 to keep the network quieter).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const hits = await api<SearchResult[]>(
          `/search?q=${encodeURIComponent(query)}`,
        );
        setResults(hits);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-start pt-[10vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl border bg-card shadow-lift overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" shouldFilter={query.length === 0 || results.length === 0}>
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="חפש ליד, נכס, או דף..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground border bg-muted/50">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="text-center text-sm text-muted-foreground py-6">
              {query.length < 3 ? 'הקלד 3 תווים לחיפוש לידים ונכסים' : 'אין תוצאות'}
            </Command.Empty>

            {results.length > 0 && (
              <Command.Group heading="תוצאות חיפוש" className="text-xs text-muted-foreground px-2 py-1">
                {results.map((r) => {
                  // Each entity type gets its own coloured icon so the user
                  // can scan the result list by category at a glance.
                  const Icon =
                    r.type === 'lead'
                      ? Users
                      : r.type === 'property'
                        ? Building
                        : r.type === 'task'
                          ? ListTodo
                          : r.type === 'conversation'
                            ? MessageSquare
                            : UsersRound;
                  const iconColor =
                    r.type === 'lead'
                      ? 'text-amber-600'
                      : r.type === 'property'
                        ? 'text-emerald-600'
                        : r.type === 'task'
                          ? 'text-violet-600'
                          : r.type === 'conversation'
                            ? 'text-blue-600'
                            : 'text-slate-600';
                  return (
                    <Command.Item
                      key={`${r.type}-${r.id}`}
                      value={`${r.type}-${r.id}-${r.title}-${r.subtitle ?? ''}`}
                      onSelect={() => go(r.href)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer aria-selected:bg-accent text-sm"
                    >
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        {r.subtitle && (
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">
                            {r.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            <Command.Group heading="ניווט" className="text-xs text-muted-foreground px-2 py-1">
              {NAV.filter((n) => !n.roles || (me && n.roles.includes(me.role))).map((n) => {
                const Icon = n.icon;
                return (
                  <Command.Item
                    key={n.href}
                    value={`nav-${n.label}-${n.href}`}
                    onSelect={() => go(n.href)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer aria-selected:bg-accent text-sm"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{n.label}</span>
                    {n.hint && (
                      <kbd className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded" dir="ltr">
                        {n.hint}
                      </kbd>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50" dir="ltr">↑↓</kbd>
              ניווט
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50 mr-2" dir="ltr">↵</kbd>
              בחר
            </span>
            <span dir="ltr">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50">⌘K</kbd> פתיחה
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
