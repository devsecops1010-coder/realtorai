'use client';

import { BellRing, Mail, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PushToggle } from '@/components/pwa/push-toggle';

/**
 * Notification preferences page. Right now we only expose the Web Push
 * toggle — email + WhatsApp delivery channels are server-side concerns and
 * don't yet have per-user opt-out toggles.
 *
 * Living under /account/* keeps it next to /account/2fa so all per-user
 * settings have a consistent URL prefix.
 */
export default function NotificationsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BellRing className="h-7 w-7 text-primary" />
          התראות
        </h1>
        <p className="text-muted-foreground mt-1">
          כאן תוכל לקבוע כיצד תקבל עדכונים מ-Realtorai.
        </p>
      </div>

      <PushToggle />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            התראות אימייל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            כרגע אנו שולחים אימייל לאירועים קריטיים בלבד (חשבון, חיוב, הזמנות צוות). תכניות
            להוסיף בעתיד: סיכום יומי, ליד חם, פעולות AI.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            התראות WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            התראות מתבצעות אוטומטית בתוך שיחת הליד עצמה. תכנון עתידי: התראות פוש ל-WA
            עסקי שלך לפי הרשאות הספק.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
