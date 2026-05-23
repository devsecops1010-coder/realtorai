'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Building, MapPin, Network as NetworkIcon, Loader2, Plus,
  Globe, Building2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Network { id: string; name: string; notes: string | null; _count?: { districts: number; branches: number; offices: number } }
interface District { id: string; name: string; region: string | null; network?: { id: string; name: string } | null; _count?: { branches: number; offices: number } }
interface Branch { id: string; name: string; city: string | null; network?: { id: string; name: string } | null; district?: { id: string; name: string } | null; _count?: { offices: number } }

/**
 * /org — manage the Network → District → Branch hierarchy. Single-office
 * tenants ignore this entirely (FKs are nullable). Multi-office tenants
 * draw the chart so district_manager / branch_manager roles eventually
 * gain scoped visibility (next sprint wires the scope into the Prisma
 * extension).
 */
export default function OrgPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline create forms (kept inline for speed — no modals in shadcn lite).
  const [openCreate, setOpenCreate] = useState<'network' | 'district' | 'branch' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [networkForm, setNetworkForm] = useState({ name: '', notes: '' });
  const [districtForm, setDistrictForm] = useState({ name: '', region: '', networkId: '' });
  const [branchForm, setBranchForm] = useState({ name: '', city: '', districtId: '', networkId: '' });

  async function load() {
    setLoading(true);
    try {
      const [n, d, b] = await Promise.all([
        api<Network[]>('/org/networks'),
        api<District[]>('/org/districts'),
        api<Branch[]>('/org/branches'),
      ]);
      setNetworks(n);
      setDistricts(d);
      setBranches(b);
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createNetwork(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/org/networks', { method: 'POST', body: networkForm });
      toast.success(`רשת "${networkForm.name}" נוצרה`);
      setNetworkForm({ name: '', notes: '' });
      setOpenCreate(null);
      await load();
    } catch (err) { toast.error((err as ApiError).message); }
    finally { setSubmitting(false); }
  }

  async function createDistrict(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/org/districts', {
        method: 'POST',
        body: {
          name: districtForm.name,
          region: districtForm.region || undefined,
          networkId: districtForm.networkId || undefined,
        },
      });
      toast.success(`מחוז "${districtForm.name}" נוצר`);
      setDistrictForm({ name: '', region: '', networkId: '' });
      setOpenCreate(null);
      await load();
    } catch (err) { toast.error((err as ApiError).message); }
    finally { setSubmitting(false); }
  }

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/org/branches', {
        method: 'POST',
        body: {
          name: branchForm.name,
          city: branchForm.city || undefined,
          districtId: branchForm.districtId || undefined,
          networkId: branchForm.networkId || undefined,
        },
      });
      toast.success(`סניף "${branchForm.name}" נוצר`);
      setBranchForm({ name: '', city: '', districtId: '', networkId: '' });
      setOpenCreate(null);
      await load();
    } catch (err) { toast.error((err as ApiError).message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" />
          מבנה ארגוני
        </h1>
        <p className="text-muted-foreground mt-1">
          רשתות → מחוזות → סניפים → משרדים. אופציונלי — משרד יחיד יכול לעבוד בלי זה.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* Networks */}
          <Section
            title="רשתות"
            icon={NetworkIcon}
            count={networks.length}
            onAdd={() => setOpenCreate('network')}
            adding={openCreate === 'network'}
          >
            {openCreate === 'network' && (
              <form onSubmit={createNetwork} className="grid md:grid-cols-3 gap-3 p-3 bg-muted/30 border-b items-end">
                <FieldText label="שם הרשת" value={networkForm.name} onChange={(v) => setNetworkForm((s) => ({ ...s, name: v }))} required />
                <FieldText label="הערות" value={networkForm.notes} onChange={(v) => setNetworkForm((s) => ({ ...s, notes: v }))} required={false} />
                <Button type="submit" disabled={submitting} className="h-10">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור רשת'}
                </Button>
              </form>
            )}
            {networks.length === 0 ? <Empty label="אין רשתות. צור ראשונה." /> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>שם</TableHead><TableHead>מחוזות</TableHead><TableHead>סניפים</TableHead><TableHead>משרדים</TableHead><TableHead>הערות</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {networks.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.name}</TableCell>
                      <TableCell className="tabular-nums">{n._count?.districts ?? 0}</TableCell>
                      <TableCell className="tabular-nums">{n._count?.branches ?? 0}</TableCell>
                      <TableCell className="tabular-nums">{n._count?.offices ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{n.notes ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          {/* Districts */}
          <Section
            title="מחוזות"
            icon={MapPin}
            count={districts.length}
            onAdd={() => setOpenCreate('district')}
            adding={openCreate === 'district'}
          >
            {openCreate === 'district' && (
              <form onSubmit={createDistrict} className="grid md:grid-cols-4 gap-3 p-3 bg-muted/30 border-b items-end">
                <FieldText label="שם המחוז" value={districtForm.name} onChange={(v) => setDistrictForm((s) => ({ ...s, name: v }))} required />
                <FieldText label="אזור" value={districtForm.region} onChange={(v) => setDistrictForm((s) => ({ ...s, region: v }))} required={false} placeholder="מרכז / צפון..." />
                <FieldSelect label="רשת" value={districtForm.networkId} onChange={(v) => setDistrictForm((s) => ({ ...s, networkId: v }))}>
                  <option value="">ללא</option>
                  {networks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </FieldSelect>
                <Button type="submit" disabled={submitting} className="h-10">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור מחוז'}
                </Button>
              </form>
            )}
            {districts.length === 0 ? <Empty label="אין מחוזות." /> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>שם</TableHead><TableHead>אזור</TableHead><TableHead>רשת</TableHead><TableHead>סניפים</TableHead><TableHead>משרדים</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {districts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.region ?? '—'}</TableCell>
                      <TableCell>{d.network?.name ? <Badge variant="outline">{d.network.name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="tabular-nums">{d._count?.branches ?? 0}</TableCell>
                      <TableCell className="tabular-nums">{d._count?.offices ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          {/* Branches */}
          <Section
            title="סניפים"
            icon={Building2}
            count={branches.length}
            onAdd={() => setOpenCreate('branch')}
            adding={openCreate === 'branch'}
          >
            {openCreate === 'branch' && (
              <form onSubmit={createBranch} className="grid md:grid-cols-5 gap-3 p-3 bg-muted/30 border-b items-end">
                <FieldText label="שם הסניף" value={branchForm.name} onChange={(v) => setBranchForm((s) => ({ ...s, name: v }))} required />
                <FieldText label="עיר" value={branchForm.city} onChange={(v) => setBranchForm((s) => ({ ...s, city: v }))} required={false} />
                <FieldSelect label="מחוז" value={branchForm.districtId} onChange={(v) => setBranchForm((s) => ({ ...s, districtId: v }))}>
                  <option value="">ללא</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </FieldSelect>
                <FieldSelect label="רשת" value={branchForm.networkId} onChange={(v) => setBranchForm((s) => ({ ...s, networkId: v }))}>
                  <option value="">ללא</option>
                  {networks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </FieldSelect>
                <Button type="submit" disabled={submitting} className="h-10">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור סניף'}
                </Button>
              </form>
            )}
            {branches.length === 0 ? <Empty label="אין סניפים." /> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>שם</TableHead><TableHead>עיר</TableHead><TableHead>מחוז</TableHead><TableHead>רשת</TableHead><TableHead>משרדים</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.city ?? '—'}</TableCell>
                      <TableCell>{b.district?.name ? <Badge variant="outline">{b.district.name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{b.network?.name ? <Badge variant="outline">{b.network.name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="tabular-nums">{b._count?.offices ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <div className="rounded-lg border bg-amber-50/50 border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30">
            <strong>הערה:</strong> כרגע ההיררכיה היא מטא-נתונים בלבד. ה-scoping האוטומטי
            של תפקידי <code>district_manager</code> / <code>branch_manager</code> ל-data של
            המחוז / סניף שלהם יחובר בספרינט הבא דרך הרחבה של Prisma extension.
          </div>
        </>
      )}
    </div>
  );
}

// --- helpers --------------------------------------------------------------

function Section({
  title, icon: Icon, count, onAdd, adding, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  onAdd: () => void;
  adding: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          <span className="text-sm text-muted-foreground font-normal">({count})</span>
        </CardTitle>
        <Button size="sm" variant={adding ? 'ghost' : 'outline'} onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {adding ? 'סגור' : 'הוסף'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function FieldText({
  label, value, onChange, required = true, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}

function FieldSelect({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-center text-muted-foreground text-sm py-8">{label}</p>;
}
