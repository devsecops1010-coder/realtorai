'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Activity, Sparkles, RotateCw } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface StatusResponse {
  status: 'operational' | 'degraded';
  uptime: number;
  version: string;
  timestamp: string;
  checks: Record<string, { ok: boolean; error?: string }>;
}

const LABEL: Record<string, string> = {
  db: 'מסד נתונים',
  redis: 'Redis (תורים + cache)',
};

/**
 * Public status page. Pings /api/status every 30 seconds.
 *
 * - No auth required — anyone can hit /status to verify the platform is up.
 * - Doesn't pull the user's tenant context — pure infrastructure view.
 * - The polling intentionally lives entirely client-side so a hung API
 *   doesn't make the page itself unrenderable.
 */
export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function load() {
    try {
      const res = await fetch(`${apiUrl}/status`, { credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const allOk = data?.status === 'operational';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-600 to-amber-500 grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">Realtorai</span>
          </Link>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            סטטוס המערכת
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            תצוגה חיה של רכיבי המערכת. מתעדכן אוטומטית כל 30 שניות.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 shadow-soft ${
            error
              ? 'bg-rose-50 border-rose-200'
              : allOk
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {error ? (
              <XCircle className="h-10 w-10 text-rose-600" />
            ) : allOk ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            ) : (
              <Activity className="h-10 w-10 text-amber-600" />
            )}
            <div>
              <p className="text-2xl font-bold">
                {error
                  ? 'אין תקשורת עם השרת'
                  : allOk
                    ? 'כל המערכות פועלות'
                    : 'תקלה חלקית'}
              </p>
              <p className="text-sm text-muted-foreground">
                {error ? error : data && `Uptime: ${formatUptime(data.uptime)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/40">
            <h2 className="font-semibold">רכיבי השרת</h2>
          </div>
          <ul className="divide-y">
            {data && Object.entries(data.checks).map(([key, c]) => (
              <li key={key} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span className="font-medium text-sm">{LABEL[key] ?? key}</span>
                </div>
                <span className={`text-xs ${c.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {c.ok ? 'תקין' : c.error ?? 'שגיאה'}
                </span>
              </li>
            ))}
            {!data && !loading && (
              <li className="px-5 py-6 text-center text-muted-foreground text-sm">
                לא ניתן לטעון נתונים
              </li>
            )}
          </ul>
        </div>

        {data && (
          <div className="text-xs text-muted-foreground flex justify-between" dir="ltr">
            <span>version: {data.version}</span>
            <span>
              last update:{' '}
              {lastFetch?.toLocaleString('en-IL', { hour12: false }) ?? '—'}
            </span>
          </div>
        )}

        <div className="text-center pt-6 border-t">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← חזרה לאתר
          </Link>
        </div>
      </main>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} ימים, ${h} שעות`;
  if (h > 0) return `${h} שעות, ${m} דקות`;
  return `${m} דקות`;
}
