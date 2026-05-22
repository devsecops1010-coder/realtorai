'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type { MortgageProfile, MortgageReferral } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  unknown: 'לא ידוע',
  not_relevant: 'לא רלוונטי',
  needs_advisor: 'דורש יועץ',
  referred: 'הופנה ליועץ',
  contacted_by_advisor: 'יועץ יצר קשר',
  pre_approved: 'אישור עקרוני',
  declined: 'נדחה',
};

const READINESS_LABEL: Record<string, string> = {
  unknown: 'לא ידוע',
  not_ready: 'לא מוכן',
  partial: 'חלקי',
  ready: 'מוכן',
  approved: 'אושר',
};

const READINESS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'hot' | 'cold'> = {
  unknown: 'secondary',
  not_ready: 'destructive',
  partial: 'warning',
  ready: 'success',
  approved: 'success',
};

export default function MortgagePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<MortgageProfile[]>([]);
  const [referrals, setReferrals] = useState<MortgageReferral[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        api<MortgageProfile[]>('/mortgage/profiles'),
        api<MortgageReferral[]>('/mortgage/referrals'),
      ]);
      setProfiles(p);
      setReferrals(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">משכנתאות</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/mortgage/advisors')}>יועצים</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרופילי משכנתא</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ליד</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>מוכנות</TableHead>
                <TableHead>ניקוד</TableHead>
                <TableHead>תקציב</TableHead>
                <TableHead>הון עצמי</TableHead>
                <TableHead>אישור עקרוני</TableHead>
                <TableHead>הסכמה</TableHead>
                <TableHead>עודכן</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">טוען...</TableCell></TableRow>
              )}
              {!loading && profiles.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">אין פרופילי משכנתא עדיין.</TableCell></TableRow>
              )}
              {profiles.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => p.lead && router.push(`/leads/${p.lead.id}`)}>
                  <TableCell>
                    {p.lead ? (
                      <Link href={`/leads/${p.lead.id}`} className="hover:underline">
                        {p.lead.fullName || p.lead.phone || '—'}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell><Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge></TableCell>
                  <TableCell><Badge variant={READINESS_VARIANT[p.readiness] ?? 'secondary'}>{READINESS_LABEL[p.readiness] ?? p.readiness}</Badge></TableCell>
                  <TableCell>{p.readinessScore ?? '—'}</TableCell>
                  <TableCell>{p.estimatedPrice ? `₪${p.estimatedPrice.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>{p.estimatedEquity ? `₪${p.estimatedEquity.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>{p.hasPreApproval ? '✅' : '—'}</TableCell>
                  <TableCell>{p.consentToShareWithAdvisor ? '✓' : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הפניות ליועצים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ליד</TableHead>
                <TableHead>יועץ</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>הופנה</TableHead>
                <TableHead>קשר ראשון</TableHead>
                <TableHead>הערות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">אין הפניות.</TableCell></TableRow>
              )}
              {referrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.profile?.lead && (
                      <Link href={`/leads/${r.profile.lead.id}`} className="hover:underline">
                        {r.profile.lead.fullName || r.profile.lead.phone || '—'}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>{r.advisor?.fullName ?? '—'} {r.advisor?.company ? `(${r.advisor.company})` : ''}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.referredAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.contactedAt ? formatDate(r.contactedAt) : '—'}</TableCell>
                  <TableCell className="text-sm">{r.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
