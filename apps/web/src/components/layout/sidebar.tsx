'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, ListTodo, MessageSquare, Home, LogOut, Building2, Bell, Building, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { clearAuth, getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Notification as AppNotification } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'דשבורד', icon: Home },
  { href: '/leads', label: 'לידים', icon: Users },
  { href: '/properties', label: 'נכסים', icon: Building },
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
    <aside className="w-64 border-l bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b">
        <h1 className="font-bold text-lg">Realtorai</h1>
        {user && <p className="text-xs text-muted-foreground mt-1">{user.name}</p>}
        {user && <p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p>}
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.badge && unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
        {user?.role === 'platform_admin' && (() => {
          const active = pathname === adminNavItem.href || pathname.startsWith(adminNavItem.href + '/');
          const Icon = adminNavItem.icon;
          return (
            <Link
              key={adminNavItem.href}
              href={adminNavItem.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mt-4 border-t pt-4',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              <Icon className="h-4 w-4" />
              {adminNavItem.label}
            </Link>
          );
        })()}
      </nav>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" onClick={logout}>
          <LogOut className="h-4 w-4 ml-2" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}
