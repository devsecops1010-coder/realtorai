'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Notification as AppNotification } from '@/lib/types';

const TYPE_LABEL: Record<string, string> = {
  hot_lead: 'ליד חם',
  handoff_required: 'דרושה התערבות',
  followup_due: 'פולואפ',
  daily_summary: 'סיכום יומי',
  system: 'מערכת',
};

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api<AppNotification[]>(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
      setItems(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [unreadOnly]);

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'POST' });
    load();
  }

  async function markAllRead() {
    await api('/notifications/mark-all-read', { method: 'POST' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">התראות</h1>
        <Button variant="outline" onClick={markAllRead}>סמן הכל כנקרא</Button>
      </div>
      <div className="flex gap-2">
        <Button variant={!unreadOnly ? 'default' : 'outline'} onClick={() => setUnreadOnly(false)}>
          הכל
        </Button>
        <Button variant={unreadOnly ? 'default' : 'outline'} onClick={() => setUnreadOnly(true)}>
          לא נקראו
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">טוען...</p>}
      {!loading && items.length === 0 && <p className="text-muted-foreground">אין התראות.</p>}

      <div className="space-y-3">
        {items.map((n) => (
          <Card key={n.id} className={n.readAt ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {n.title}
                  <Badge
                    variant={
                      n.severity === 'alert' ? 'destructive' : n.severity === 'warning' ? 'warning' : 'secondary'
                    }
                  >
                    {TYPE_LABEL[n.type] ?? n.type}
                  </Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                {n.body && <p className="text-sm">{n.body}</p>}
                {n.link && (
                  <Link href={n.link} className="text-sm text-primary hover:underline mt-1 inline-block">
                    פתח
                  </Link>
                )}
              </div>
              {!n.readAt && (
                <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                  סמן כנקרא
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
