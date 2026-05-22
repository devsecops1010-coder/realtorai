'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth';

interface RevenueSummary {
  mrr: number;
  tenantCount: number;
  activeTenantCount: number;
  tenants: {
    id: string;
    name: string;
    status: string;
    monthlyPlanIls: number;
    setupFeeIls: number;
  }[];
}

interface PlatformHealth {
  tenants: number;
  activeTenants: number;
  leadsLast24h: number;
  messagesLast24h: number;
  openHandoffs: number;
}

interface UsageRow {
  tenantId: string;
  name: string;
  status: string;
  plan: string;
  byType: Record<string, { quantity: number; costEstimate: string }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (u?.role !== 'platform_admin' && u?.role !== 'platform_owner') {
      router.replace('/dashboard');
      return;
    }
    (async () => {
      try {
        const [h, r, ur] = await Promise.all([
          api<PlatformHealth>('/admin/health'),
          api<RevenueSummary>('/admin/revenue'),
          api<UsageRow[]>('/admin/usage'),
        ]);
        setHealth(h);
        setRevenue(r);
        setUsage(ur);
      } catch {
        setForbidden(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (forbidden) return <div className="text-destructive">אין הרשאה לדף זה.</div>;
  if (loading || !health || !revenue) return <div>טוען...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin — סקירת פלטפורמה</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="MRR (₪)" value={revenue.mrr.toLocaleString()} />
        <Stat label="משרדים" value={health.tenants} />
        <Stat label="פעילים" value={health.activeTenants} />
        <Stat label="לידים 24ש" value={health.leadsLast24h} />
        <Stat label="הודעות 24ש" value={health.messagesLast24h} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>משרדים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תוכנית</TableHead>
                <TableHead>הקמה (₪)</TableHead>
                <TableHead>חודשי (₪)</TableHead>
                <TableHead>טוקנים החודש</TableHead>
                <TableHead>הודעות החודש</TableHead>
                <TableHead>עלות מוערכת ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenue.tenants.map((t) => {
                const u = usage.find((x) => x.tenantId === t.id);
                const llm = u?.byType['llm_tokens'];
                const wa = u?.byType['whatsapp_message'];
                const cost =
                  (llm ? parseFloat(llm.costEstimate) : 0) +
                  (wa ? parseFloat(wa.costEstimate) : 0);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'active' ? 'success' : 'outline'}>{t.status}</Badge>
                    </TableCell>
                    <TableCell>{u?.plan ?? '—'}</TableCell>
                    <TableCell>{t.setupFeeIls?.toLocaleString() ?? 0}</TableCell>
                    <TableCell>{t.monthlyPlanIls?.toLocaleString() ?? 0}</TableCell>
                    <TableCell>{llm?.quantity ?? 0}</TableCell>
                    <TableCell>{wa?.quantity ?? 0}</TableCell>
                    <TableCell>${cost.toFixed(4)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
