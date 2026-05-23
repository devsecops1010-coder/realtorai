'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth';

interface Plan {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string | null;
  tagline: string | null;
  setupFeeIls: number;
  monthlyPlanIls: number;
  includedMessages: number;
  includedCallMinutes: number;
  monthlyLlmBudgetUsd: string;
  extraMessageIls: string;
  extraCallMinuteIls: string;
  successFeePct: string;
  features: Record<string, unknown>;
  active: boolean;
  publishedAt: string | null;
  sortOrder: number;
}

export default function PlanCatalogAdminPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    slug: '',
    nameHe: '',
    nameEn: '',
    tagline: '',
    monthlyPlanIls: '0',
    setupFeeIls: '0',
    includedMessages: '0',
    monthlyLlmBudgetUsd: '0',
  });

  function reload() {
    return api<Plan[]>('/admin/catalog/plans?includeInactive=true').then(setPlans);
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

  async function doCreate() {
    if (!form.slug.trim() || !form.nameHe.trim()) {
      toast.error('יש למלא slug + שם');
      return;
    }
    setCreating(true);
    try {
      await api('/admin/catalog/plans', {
        method: 'POST',
        body: JSON.stringify({
          slug: form.slug,
          nameHe: form.nameHe,
          nameEn: form.nameEn || undefined,
          tagline: form.tagline || undefined,
          monthlyPlanIls: Number(form.monthlyPlanIls) || 0,
          setupFeeIls: Number(form.setupFeeIls) || 0,
          includedMessages: Number(form.includedMessages) || 0,
          monthlyLlmBudgetUsd: form.monthlyLlmBudgetUsd || '0',
        }),
      });
      toast.success('התוכנית נוצרה');
      setShowCreate(false);
      setForm({
        slug: '',
        nameHe: '',
        nameEn: '',
        tagline: '',
        monthlyPlanIls: '0',
        setupFeeIls: '0',
        includedMessages: '0',
        monthlyLlmBudgetUsd: '0',
      });
      await reload();
    } catch (e) {
      toast.error(`יצירה נכשלה: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(p: Plan) {
    try {
      await api(`/admin/catalog/plans/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !p.active }),
      });
      toast.success(p.active ? 'התוכנית הושבתה' : 'התוכנית הופעלה');
      await reload();
    } catch (e) {
      toast.error(`עדכון נכשל: ${(e as Error).message}`);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api(`/admin/catalog/plans/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nameHe: editing.nameHe,
          nameEn: editing.nameEn || undefined,
          tagline: editing.tagline || undefined,
          monthlyPlanIls: editing.monthlyPlanIls,
          setupFeeIls: editing.setupFeeIls,
          includedMessages: editing.includedMessages,
          includedCallMinutes: editing.includedCallMinutes,
          monthlyLlmBudgetUsd: editing.monthlyLlmBudgetUsd,
          extraMessageIls: editing.extraMessageIls,
          extraCallMinuteIls: editing.extraCallMinuteIls,
          successFeePct: editing.successFeePct,
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
              <Sparkles className="h-7 w-7 text-primary" />
              קטלוג תוכניות
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {plans.length} תוכניות — {plans.filter((p) => p.active).length} פעילות
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 ml-1.5" />
            תוכנית חדשה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`cursor-pointer hover:border-primary/40 transition ${!p.active ? 'opacity-60' : ''}`}
            onClick={() => setEditing(p)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{p.nameHe}</span>
                <div className="flex items-center gap-2">
                  {!p.active && (
                    <Badge variant="outline" className="text-[10px]">
                      לא פעיל
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground" dir="ltr">
                    {p.slug}
                  </span>
                </div>
              </CardTitle>
              {p.tagline && (
                <p className="text-xs text-muted-foreground mt-1">{p.tagline}</p>
              )}
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <KV label="חודשי" value={`₪${p.monthlyPlanIls.toLocaleString()}`} />
              <KV label="הקמה" value={`₪${p.setupFeeIls.toLocaleString()}`} />
              <KV label="הודעות כלולות" value={p.includedMessages.toLocaleString()} />
              <KV label="תקציב LLM" value={`$${p.monthlyLlmBudgetUsd}`} />
              {Object.keys(p.features).length > 0 && (
                <div className="pt-2 border-t mt-2 flex flex-wrap gap-1">
                  {Object.entries(p.features).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px]">
                      {k}: {String(v)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <p className="col-span-full text-center py-12 text-muted-foreground">אין תוכניות.</p>
        )}
      </div>

      {showCreate && (
        <Modal title="תוכנית חדשה" onClose={() => setShowCreate(false)}>
          <FormGroup label="slug (ייחודי, אנגלית)">
            <Input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </FormGroup>
          <FormGroup label="שם בעברית">
            <Input value={form.nameHe} onChange={(e) => setForm({ ...form, nameHe: e.target.value })} />
          </FormGroup>
          <FormGroup label="שם באנגלית">
            <Input dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </FormGroup>
          <FormGroup label="תיאור קצר (tagline)">
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="חודשי ₪">
              <Input type="number" value={form.monthlyPlanIls} onChange={(e) => setForm({ ...form, monthlyPlanIls: e.target.value })} />
            </FormGroup>
            <FormGroup label="הקמה ₪">
              <Input type="number" value={form.setupFeeIls} onChange={(e) => setForm({ ...form, setupFeeIls: e.target.value })} />
            </FormGroup>
            <FormGroup label="הודעות">
              <Input type="number" value={form.includedMessages} onChange={(e) => setForm({ ...form, includedMessages: e.target.value })} />
            </FormGroup>
            <FormGroup label="תקציב LLM $">
              <Input value={form.monthlyLlmBudgetUsd} onChange={(e) => setForm({ ...form, monthlyLlmBudgetUsd: e.target.value })} />
            </FormGroup>
          </div>
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
            <Input value={editing.nameHe} onChange={(e) => setEditing({ ...editing, nameHe: e.target.value })} />
          </FormGroup>
          <FormGroup label="שם באנגלית">
            <Input dir="ltr" value={editing.nameEn ?? ''} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
          </FormGroup>
          <FormGroup label="תיאור">
            <Input value={editing.tagline ?? ''} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="חודשי ₪">
              <Input
                type="number"
                value={editing.monthlyPlanIls}
                onChange={(e) => setEditing({ ...editing, monthlyPlanIls: Number(e.target.value) })}
              />
            </FormGroup>
            <FormGroup label="הקמה ₪">
              <Input
                type="number"
                value={editing.setupFeeIls}
                onChange={(e) => setEditing({ ...editing, setupFeeIls: Number(e.target.value) })}
              />
            </FormGroup>
            <FormGroup label="הודעות">
              <Input
                type="number"
                value={editing.includedMessages}
                onChange={(e) => setEditing({ ...editing, includedMessages: Number(e.target.value) })}
              />
            </FormGroup>
            <FormGroup label="דקות שיחה">
              <Input
                type="number"
                value={editing.includedCallMinutes}
                onChange={(e) => setEditing({ ...editing, includedCallMinutes: Number(e.target.value) })}
              />
            </FormGroup>
            <FormGroup label="תקציב LLM $">
              <Input
                value={editing.monthlyLlmBudgetUsd}
                onChange={(e) => setEditing({ ...editing, monthlyLlmBudgetUsd: e.target.value })}
              />
            </FormGroup>
            <FormGroup label="עלות הודעה נוספת ₪">
              <Input
                value={editing.extraMessageIls}
                onChange={(e) => setEditing({ ...editing, extraMessageIls: e.target.value })}
              />
            </FormGroup>
            <FormGroup label="עלות דקת שיחה נוספת ₪">
              <Input
                value={editing.extraCallMinuteIls}
                onChange={(e) => setEditing({ ...editing, extraCallMinuteIls: e.target.value })}
              />
            </FormGroup>
            <FormGroup label="success fee %">
              <Input
                value={editing.successFeePct}
                onChange={(e) => setEditing({ ...editing, successFeePct: e.target.value })}
              />
            </FormGroup>
          </div>
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" dir="ltr">
        {value}
      </span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg my-8 rounded-xl bg-background border shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
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
