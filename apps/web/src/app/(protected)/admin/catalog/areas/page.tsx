'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth';

interface Area {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string | null;
  region: string | null;
  active: boolean;
  sortOrder: number;
}

/**
 * platform_admin CRUD for the AreaCatalog. The list and the create form share
 * a single page — keeps the round-trips low for an admin-only screen.
 */
export default function AreaCatalogAdminPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [form, setForm] = useState({ slug: '', nameHe: '', nameEn: '', region: '', sortOrder: '100' });

  function reload() {
    return api<Area[]>('/admin/catalog/areas?includeInactive=true').then(setAreas);
  }

  useEffect(() => {
    const u = getCurrentUser();
    if (u?.role !== 'platform_admin' && u?.role !== 'platform_owner') {
      router.replace('/dashboard');
      return;
    }
    reload()
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter(
      (a) =>
        a.nameHe.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.region?.toLowerCase().includes(q),
    );
  }, [areas, query]);

  // Group by region for visual chunking in the list. Same region rows stay
  // together; regions sorted by their first row's sortOrder.
  const byRegion = useMemo(() => {
    const groups = new Map<string, Area[]>();
    for (const a of filtered) {
      const key = a.region ?? 'ללא איזור';
      const arr = groups.get(key) ?? [];
      arr.push(a);
      groups.set(key, arr);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return Array.from(groups.entries()).sort(
      ([, a], [, b]) => (a[0]?.sortOrder ?? 999) - (b[0]?.sortOrder ?? 999),
    );
  }, [filtered]);

  async function doCreate() {
    if (!form.slug.trim() || !form.nameHe.trim()) {
      toast.error('יש למלא slug ושם בעברית');
      return;
    }
    setCreating(true);
    try {
      await api<Area>('/admin/catalog/areas', {
        method: 'POST',
        body: JSON.stringify({
          slug: form.slug,
          nameHe: form.nameHe,
          nameEn: form.nameEn || undefined,
          region: form.region || undefined,
          sortOrder: Number(form.sortOrder) || 100,
        }),
      });
      toast.success('האזור נוצר');
      setShowCreate(false);
      setForm({ slug: '', nameHe: '', nameEn: '', region: '', sortOrder: '100' });
      await reload();
    } catch (e) {
      toast.error(`יצירה נכשלה: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(a: Area) {
    try {
      await api(`/admin/catalog/areas/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !a.active }),
      });
      toast.success(a.active ? 'האזור הושבת' : 'האזור הופעל');
      await reload();
    } catch (e) {
      toast.error(`עדכון נכשל: ${(e as Error).message}`);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api(`/admin/catalog/areas/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nameHe: editing.nameHe,
          nameEn: editing.nameEn || undefined,
          region: editing.region || undefined,
          sortOrder: editing.sortOrder,
        }),
      });
      toast.success('נשמר');
      setEditing(null);
      await reload();
    } catch (e) {
      toast.error(`עדכון נכשל: ${(e as Error).message}`);
    }
  }

  if (forbidden) return <div className="text-destructive">אין הרשאה.</div>;
  if (loading) return <div>טוען...</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה ל-Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MapPin className="h-7 w-7 text-primary" />
              קטלוג אזורים
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {areas.length} רשומות — {areas.filter((a) => a.active).length} פעילות
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 ml-1.5" />
            אזור חדש
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם / slug / איזור"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {byRegion.map(([region, rows]) => (
            <div key={region}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">{region}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {rows.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setEditing(a)}
                    className={`text-right rounded-lg border p-3 transition-colors hover:border-primary/40 ${
                      a.active ? 'bg-background' : 'bg-muted/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.nameHe}</span>
                      {!a.active && (
                        <Badge variant="outline" className="text-[10px]">
                          לא פעיל
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {a.slug}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">לא נמצאו אזורים.</p>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <Modal title="אזור חדש" onClose={() => setShowCreate(false)}>
          <FormGroup label="slug (אנגלית, ייחודי)">
            <Input
              dir="ltr"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="kfar-saba-east"
            />
          </FormGroup>
          <FormGroup label="שם בעברית">
            <Input value={form.nameHe} onChange={(e) => setForm({ ...form, nameHe: e.target.value })} />
          </FormGroup>
          <FormGroup label="שם באנגלית (אופציונלי)">
            <Input
              dir="ltr"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="איזור (מרכז / צפון / דרום / ...)">
            <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </FormGroup>
          <FormGroup label="סדר הצגה">
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </FormGroup>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              ביטול
            </Button>
            <Button size="sm" disabled={creating} onClick={doCreate}>
              צור
            </Button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`עריכה: ${editing.nameHe}`} onClose={() => setEditing(null)}>
          <FormGroup label="slug">
            <Input dir="ltr" value={editing.slug} disabled />
          </FormGroup>
          <FormGroup label="שם בעברית">
            <Input
              value={editing.nameHe}
              onChange={(e) => setEditing({ ...editing, nameHe: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="שם באנגלית">
            <Input
              dir="ltr"
              value={editing.nameEn ?? ''}
              onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="איזור">
            <Input
              value={editing.region ?? ''}
              onChange={(e) => setEditing({ ...editing, region: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="סדר הצגה">
            <Input
              type="number"
              value={editing.sortOrder}
              onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
            />
          </FormGroup>
          <div className="flex gap-2 justify-between mt-4">
            <Button variant="outline" size="sm" onClick={() => toggleActive(editing)}>
              {editing.active ? 'השבת' : 'הפעל'}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                ביטול
              </Button>
              <Button size="sm" onClick={saveEdit}>
                שמירה
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-sm font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-background border shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
