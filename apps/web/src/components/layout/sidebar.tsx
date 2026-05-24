'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  ListTodo,
  MessageSquare,
  Home,
  LogOut,
  Building2,
  Bell,
  Building,
  Shield,
  Banknote,
  Sparkles,
  UsersRound,
  Eye,
  Megaphone,
  ScrollText,
  FileSignature,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { clearAuth, getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  ALL_ROLES,
  EXECUTIVE_ROLES,
  FINANCE_ROLES,
  getWorkspaceForRole,
  isOneOf,
  MARKETING_ROLES,
  MANAGEMENT_ROLES,
  MORTGAGE_ROLES,
  OFFICE_VISIBILITY_ROLES,
  OPERATIONS_ROLES,
  ROLE_LABELS,
  SALES_ROLES,
} from '@/lib/role-workspace';
import type { Notification as AppNotification, UserRole } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  badge?: true;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'אזור אישי',
    items: [
      { href: '/dashboard', label: 'המרכז שלי', icon: Home, roles: ALL_ROLES },
      { href: '/notifications', label: 'התראות', icon: Bell, roles: ALL_ROLES, badge: true },
    ],
  },
  {
    label: 'עבודה שוטפת',
    items: [
      {
        href: '/leads',
        label: 'לידים',
        icon: Users,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MORTGAGE_ROLES, ...MARKETING_ROLES, ...OPERATIONS_ROLES, 'viewer'],
      },
      {
        href: '/conversations',
        label: 'שיחות',
        icon: MessageSquare,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MORTGAGE_ROLES, ...OPERATIONS_ROLES, 'viewer'],
      },
      {
        href: '/tasks',
        label: 'משימות',
        icon: ListTodo,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MORTGAGE_ROLES, ...OPERATIONS_ROLES],
      },
      {
        href: '/properties',
        label: 'נכסים',
        icon: Building,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MARKETING_ROLES, ...OPERATIONS_ROLES, 'viewer'],
      },
      {
        href: '/mortgage',
        label: 'משכנתאות',
        icon: Banknote,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MORTGAGE_ROLES, ...OPERATIONS_ROLES],
      },
      {
        href: '/growth',
        label: 'הפצה וצמיחה',
        icon: Megaphone,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MARKETING_ROLES, ...OPERATIONS_ROLES],
      },
      {
        href: '/documents',
        label: 'מסמכים לחתימה',
        icon: FileSignature,
        roles: [...MANAGEMENT_ROLES, ...SALES_ROLES, ...MORTGAGE_ROLES, ...OPERATIONS_ROLES],
      },
    ],
  },
  {
    label: 'ניהול',
    items: [
      { href: '/team', label: 'צוות והרשאות', icon: UsersRound, roles: MANAGEMENT_ROLES },
      { href: '/office', label: 'המשרד שלי', icon: Building2, roles: OFFICE_VISIBILITY_ROLES },
      { href: '/org', label: 'מבנה ארגוני', icon: Globe, roles: MANAGEMENT_ROLES },
      { href: '/audit', label: 'יומן ביקורת', icon: ScrollText, roles: MANAGEMENT_ROLES },
    ],
  },
];

const adminNavItem = { href: '/admin', label: 'אדמין פלטפורמה', icon: Shield };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getCurrentUser();
  const role = user?.role ?? 'viewer';
  const workspace = getWorkspaceForRole(role);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await api<AppNotification[]>('/notifications?unreadOnly=true');
        if (!cancelled) setUnreadCount(list.length);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pathname]);

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearAuth();
    router.push('/login');
  }

  return (
    <aside className="w-72 border-l bg-card/90 backdrop-blur flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {/* Unified brand chip — same gradient as marketing nav so the
              user feels they're in the same product after logging in. */}
          <div className="h-8 w-8 rounded-lg bg-[linear-gradient(135deg,hsl(var(--grad-from))_0%,hsl(var(--grad-to))_100%)] grid place-items-center shadow-soft">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg">Realtorai</span>
        </Link>
        {user && (
          <div className="mt-4 rounded-xl border bg-background/80 p-3 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate" dir="ltr">{user.email}</p>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
                {ROLE_LABELS[role]}
              </span>
            </div>
            <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-xs font-medium text-foreground">{workspace.label}</p>
              <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{workspace.scope}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || isOneOf(role, item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        active
                          ? 'bg-primary/10 text-primary shadow-soft'
                          : 'text-foreground/70 hover:text-foreground hover:bg-accent/50',
                      )}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon className={cn('h-4 w-4 flex-shrink-0', active && 'text-primary')} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge && unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.5rem] text-center font-semibold">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {(user?.role === 'platform_admin' || user?.role === 'platform_owner') && (() => {
          const active = pathname === adminNavItem.href || pathname.startsWith(adminNavItem.href + '/');
          const Icon = adminNavItem.icon;
          return (
            <div className="pt-4 mt-4 border-t">
              <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground">פלטפורמה</p>
              <Link
                href={adminNavItem.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-primary/10 text-primary shadow-soft'
                    : 'text-foreground/70 hover:text-foreground hover:bg-accent/50',
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                {adminNavItem.label}
              </Link>
            </div>
          );
        })()}
      </nav>

      <div className="p-3 border-t space-y-1">
        {user?.role === 'viewer' && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            צפייה בלבד
          </div>
        )}
        {/* Per-user settings live under /account/*. Surfacing 2FA + push
            here is enough — the sidebar isn't where we want a deep settings
            menu. Adds horizontal divider above for visual separation. */}
        <Link
          href="/account/notifications"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors ${pathname?.startsWith('/account/notifications') ? 'bg-accent' : ''}`}
        >
          <Bell className="h-4 w-4" />
          העדפות התראות
        </Link>
        <Link
          href="/account/2fa"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors ${pathname?.startsWith('/account/2fa') ? 'bg-accent' : ''}`}
        >
          <Shield className="h-4 w-4" />
          אבטחה (2FA)
        </Link>
        <Link
          href="/account/data"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors ${pathname?.startsWith('/account/data') ? 'bg-accent' : ''}`}
        >
          <ScrollText className="h-4 w-4" />
          ייצוא + ייבוא נתונים
        </Link>
        <Button variant="ghost" className="w-full justify-start" onClick={logout}>
          <LogOut className="h-4 w-4 ml-2" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}
