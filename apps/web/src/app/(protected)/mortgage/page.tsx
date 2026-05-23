'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [coAppEditing, setCoAppEditing] = useState<MortgageProfile | null>(null);

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
                <TableHead>תקציב</TableHead>
                <TableHead>הון עצמי</TableHead>
                <TableHead>לווה 2</TableHead>
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
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => p.lead && router.push(`/leads/${p.lead.id}`)}>
                  <TableCell>
                    {p.lead ? (
                      <Link href={`/leads/${p.lead.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {p.lead.fullName || p.lead.phone || '—'}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell><Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge></TableCell>
                  <TableCell><Badge variant={READINESS_VARIANT[p.readiness] ?? 'secondary'}>{READINESS_LABEL[p.readiness] ?? p.readiness}</Badge></TableCell>
                  <TableCell>{p.estimatedPrice ? `₪${p.estimatedPrice.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>{p.estimatedEquity ? `₪${p.estimatedEquity.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>
                    {/* Co-applicant editor — required for joint mortgages. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoAppEditing(p);
                      }}
                      className="inline-flex items-center gap-1 rounded-md hover:bg-accent px-1.5 py-0.5 text-xs"
                    >
                      {p.coApplicantName ? (
                        <span className="text-foreground">{p.coApplicantName}</span>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> הוסף
                        </span>
                      )}
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableCell>
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

      {coAppEditing && (
        <CoApplicantDialog
          profile={coAppEditing}
          onClose={() => setCoAppEditing(null)}
          onSaved={async () => {
            setCoAppEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/**
 * Inline editor for the mortgage profile's co-applicant (לווה 2). Bank
 * authorization letters that involve a couple/joint borrower need this
 * second person's name + national ID + phone. We don't store this on the
 * Lead because the co-applicant is usually a spouse/partner with no
 * separate CRM record.
 */
function CoApplicantDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: MortgageProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    coApplicantName: profile.coApplicantName ?? '',
    coApplicantNationalId: profile.coApplicantNationalId ?? '',
    coApplicantPhone: profile.coApplicantPhone ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/mortgage/profiles/${profile.id}`, {
        method: 'PATCH',
        body: form,
      });
      toast.success('פרטי לווה 2 נשמרו');
      onSaved();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await api(`/mortgage/profiles/${profile.id}`, {
        method: 'PATCH',
        body: { coApplicantName: '', coApplicantNationalId: '', coApplicantPhone: '' },
      });
      toast.success('פרטי לווה 2 נמחקו');
      onSaved();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md my-8 rounded-xl bg-background border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            פרטי לווה 2
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            לרוב בן/בת זוג. נדרש לכתבי הסמכה לבנקים במשכנתאות משותפות. אם הלקוח לבד, אפשר להשאיר ריק.
          </p>
          <div>
            <label className="text-sm font-medium block mb-1">שם מלא</label>
            <Input value={form.coApplicantName} onChange={(e) => setForm({ ...form, coApplicantName: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ת״ז / דרכון</label>
            <Input dir="ltr" value={form.coApplicantNationalId} onChange={(e) => setForm({ ...form, coApplicantNationalId: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">טלפון</label>
            <Input dir="ltr" value={form.coApplicantPhone} onChange={(e) => setForm({ ...form, coApplicantPhone: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-between gap-2 border-t px-5 py-3">
          {profile.coApplicantName ? (
            <Button variant="outline" size="sm" onClick={clear} disabled={saving}>
              נקה
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>ביטול</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
