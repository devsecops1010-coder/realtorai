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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { clearAuth, getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Notification as AppNotification } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'דשבורד', icon: Home },
  { href: '/leads', label: 'לידים', icon: Users },
  { href: '/properties', label: 'נכסים', icon: Building },
  { href: '/mortgage', label: 'משכנתאות', icon: Banknote },
  { href: '/tasks', label: 'משימות', icon: ListTodo },
  { href: '/conversations', label: 'שיחות', icon: MessageSquare },
  { href: '/notifications', label: 'התראות', icon: Bell, badge: true as const },
  { href: '/office', label: 'המשרד שלי', icon: Building2 },
];

const adminNavItem = { href: '/admin', label: 'אדמין פלטפורמה', icon: Shield };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getCurrentUser();
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
    <aside className="w-64 border-l bg-card/80 backdrop-blur flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center shadow-soft">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg">Realtorai</span>
        </Link>
        {user && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-muted/50">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate" dir="ltr">{user.email}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/70 hover:text-foreground hover:bg-accent/50',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                {item.label}
              </span>
              {item.badge && unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.5rem] text-center font-semibold">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {(user?.role === 'platform_admin' || user?.role === 'platform_owner') && (() => {
          const active = pathname === adminNavItem.href || pathname.startsWith(adminNavItem.href + '/');
          const Icon = adminNavItem.icon;
          return (
            <div className="pt-4 mt-4 border-t">
              <p className="px-3 mb-1 text-xs uppercase tracking-wider text-muted-foreground">פלטפורמה</p>
              <Link
                href={adminNavItem.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-primary/10 text-primary'
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

      <div className="p-3 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={logout}>
          <LogOut className="h-4 w-4 ml-2" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}
