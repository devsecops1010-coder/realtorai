'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, FileSignature, AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiUrl, ApiError, csrfHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface BankTemplate {
  id: string;
  bankSlug: string;
  bankNameHe: string;
  bankNameEn: string | null;
  notes: string | null;
}

type BankAuthValues = Partial<Record<
  | 'borrower1_name' | 'borrower1_id' | 'borrower1_phone' | 'borrower1_email' | 'borrower1_address'
  | 'borrower2_name' | 'borrower2_id' | 'borrower2_phone'
  | 'advisor_name' | 'advisor_id' | 'advisor_phone' | 'advisor_company_name' | 'advisor_company_id' | 'advisor_license_number'
  | 'date',
  string
>>;

interface ResolveResponse {
  values: BankAuthValues;
  missing: string[];
}

const FIELD_LABELS: Record<keyof BankAuthValues, string> = {
  borrower1_name: 'שם לווה',
  borrower1_id: 'ת"ז לווה',
  borrower1_phone: 'טלפון לווה',
  borrower1_email: 'אימייל לווה',
  borrower1_address: 'כתובת לווה',
  borrower2_name: 'שם לווה 2',
  borrower2_id: 'ת"ז לווה 2',
  borrower2_phone: 'טלפון לווה 2',
  advisor_name: 'שם יועץ',
  advisor_id: 'ת"ז יועץ',
  advisor_phone: 'טלפון יועץ',
  advisor_company_name: 'שם חברת ייעוץ',
  advisor_company_id: 'ח.פ. חברת ייעוץ',
  advisor_license_number: 'מס׳ רישיון יועץ',
  date: 'תאריך',
};

const PRIMARY_FIELDS: (keyof BankAuthValues)[] = [
  'borrower1_name',
  'borrower1_id',
  'borrower1_phone',
  'advisor_name',
  'advisor_id',
  'advisor_phone',
  'advisor_company_name',
  'advisor_company_id',
];

interface Props {
  leadId: string;
  /** Called after successful create — receives the SignDocument id. */
  onCreated: (docId: string) => void;
  onClose: () => void;
}

/**
 * 3-step modal:
 *   1. Pick a bank
 *   2. Review + edit auto-filled fields (missing ones highlighted)
 *   3. Preview the rendered PDF inline, then confirm "create" to persist as
 *      a SignDocument (status=draft) for the lead.
 *
 * The preview re-renders via a Blob URL fetched from
 * POST /sign/bank-auth/preview each time `values` changes — so the user can
 * tweak and immediately see the result.
 */
export function BankAuthDialog({ leadId, onCreated, onClose }: Props) {
  const [step, setStep] = useState<'bank' | 'fields' | 'preview'>('bank');
  const [banks, setBanks] = useState<BankTemplate[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [values, setValues] = useState<BankAuthValues>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api<BankTemplate[]>('/sign/bank-auth/templates')
      .then(setBanks)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedBank = useMemo(
    () => banks.find((b) => b.bankSlug === selectedSlug) ?? null,
    [banks, selectedSlug],
  );

  async function pickBank(slug: string) {
    setSelectedSlug(slug);
    try {
      // Resolve auto-fill values for the chosen lead
      const res = await api<ResolveResponse>(`/sign/bank-auth/resolve/${leadId}`);
      setValues(res.values);
      setMissing(res.missing);
      setStep('fields');
    } catch (e) {
      toast.error(`טעינת פרטים נכשלה: ${(e as ApiError).message}`);
    }
  }

  function setField(key: keyof BankAuthValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function generatePreview() {
    if (!selectedSlug) return;
    setPreviewing(true);
    try {
      const res = await fetch(`${apiUrl}/sign/bank-auth/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ bankSlug: selectedSlug, values }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setStep('preview');
    } catch (e) {
      toast.error(`תצוגה מקדימה נכשלה: ${(e as Error).message}`);
    } finally {
      setPreviewing(false);
    }
  }

  async function createDoc() {
    if (!selectedSlug) return;
    setCreating(true);
    try {
      const doc = await api<{ id: string }>('/sign/bank-auth/create', {
        method: 'POST',
        body: { bankSlug: selectedSlug, leadId, values },
      });
      toast.success('כתב ההסמכה נשמר כטיוטה');
      onCreated(doc.id);
    } catch (e) {
      toast.error(`יצירה נכשלה: ${(e as ApiError).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-3xl my-8 rounded-xl bg-background border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            כתב הסמכה לבנק
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-2 text-xs border-b bg-muted/40">
          <StepDot active={step === 'bank'} done={step !== 'bank'} label="בחירת בנק" />
          <span className="text-muted-foreground">→</span>
          <StepDot active={step === 'fields'} done={step === 'preview'} label="פרטים" />
          <span className="text-muted-foreground">→</span>
          <StepDot active={step === 'preview'} done={false} label="תצוגה ושליחה" />
        </div>

        <div className="p-5">
          {step === 'bank' && (
            <BankPicker banks={banks} loading={loading} onPick={pickBank} />
          )}

          {step === 'fields' && selectedBank && (
            <FieldsForm
              bank={selectedBank}
              values={values}
              missing={missing}
              onChange={setField}
              onBack={() => setStep('bank')}
              onContinue={generatePreview}
              continuing={previewing}
            />
          )}

          {step === 'preview' && previewUrl && selectedBank && (
            <PreviewStep
              bank={selectedBank}
              previewUrl={previewUrl}
              onBack={() => setStep('fields')}
              onConfirm={createDoc}
              creating={creating}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${
        active ? 'bg-primary text-primary-foreground font-semibold' : done ? 'text-emerald-700' : 'text-muted-foreground'
      }`}
    >
      {done ? '✓' : '•'} {label}
    </span>
  );
}

function BankPicker({
  banks,
  loading,
  onPick,
}: {
  banks: BankTemplate[];
  loading: boolean;
  onPick: (slug: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">בחר את הבנק שאליו תיוצר ההסמכה. המערכת תשתמש בטופס המקורי של הבנק.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {banks.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(b.bankSlug)}
            className="text-right rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {b.bankNameHe}
                </p>
                {b.bankNameEn && (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {b.bankNameEn}
                  </p>
                )}
              </div>
              {b.bankSlug === 'discount' || b.bankSlug === 'mercantile' ? (
                <Badge variant="success" className="text-[10px] shrink-0">
                  טופס AcroForm
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  טופס בסיסי
                </Badge>
              )}
            </div>
            {b.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{b.notes}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldsForm({
  bank,
  values,
  missing,
  onChange,
  onBack,
  onContinue,
  continuing,
}: {
  bank: BankTemplate;
  values: BankAuthValues;
  missing: string[];
  onChange: (key: keyof BankAuthValues, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  continuing: boolean;
}) {
  const missingSet = new Set(missing);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          טופס <strong>{bank.bankNameHe}</strong> · עברו על השדות ועדכנו במידת הצורך.
        </p>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">חסרים פרטים</p>
            <p className="text-xs text-amber-800">
              לא נמצאו: {missing.map((k) => FIELD_LABELS[k as keyof BankAuthValues] ?? k).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRIMARY_FIELDS.map((k) => (
          <div key={k}>
            <label className="text-xs font-medium block mb-1">
              {FIELD_LABELS[k]}
              {missingSet.has(k) && <span className="text-amber-700 mr-1">*</span>}
            </label>
            <Input
              value={values[k] ?? ''}
              onChange={(e) => onChange(k, e.target.value)}
              dir={k.includes('email') || k.includes('id') || k.includes('phone') ? 'ltr' : undefined}
              className={missingSet.has(k) && !values[k] ? 'border-amber-400 focus:ring-amber-400' : ''}
            />
          </div>
        ))}
      </div>

      <details className="rounded-lg border bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">פרטים נוספים (אופציונלי)</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          <div>
            <label className="text-xs font-medium block mb-1">{FIELD_LABELS.borrower2_name}</label>
            <Input
              value={values.borrower2_name ?? ''}
              onChange={(e) => onChange('borrower2_name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{FIELD_LABELS.borrower2_id}</label>
            <Input
              dir="ltr"
              value={values.borrower2_id ?? ''}
              onChange={(e) => onChange('borrower2_id', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{FIELD_LABELS.borrower2_phone}</label>
            <Input
              dir="ltr"
              value={values.borrower2_phone ?? ''}
              onChange={(e) => onChange('borrower2_phone', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{FIELD_LABELS.advisor_license_number}</label>
            <Input
              dir="ltr"
              value={values.advisor_license_number ?? ''}
              onChange={(e) => onChange('advisor_license_number', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium block mb-1">{FIELD_LABELS.borrower1_address}</label>
            <Input
              value={values.borrower1_address ?? ''}
              onChange={(e) => onChange('borrower1_address', e.target.value)}
            />
          </div>
        </div>
      </details>

      <div className="flex justify-between gap-2 pt-2 border-t mt-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          חזרה לבחירת בנק
        </Button>
        <Button size="sm" disabled={continuing} onClick={onContinue}>
          {continuing ? 'יוצר תצוגה...' : 'תצוגה מקדימה'}
        </Button>
      </div>
    </div>
  );
}

function PreviewStep({
  bank,
  previewUrl,
  onBack,
  onConfirm,
  creating,
}: {
  bank: BankTemplate;
  previewUrl: string;
  onBack: () => void;
  onConfirm: () => void;
  creating: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        תצוגה מקדימה של כתב ההסמכה לבנק <strong>{bank.bankNameHe}</strong>. שמירה תיצור מסמך טיוטה
        שאפשר לשלוח לחתימה מהדף הראשי.
      </p>
      <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border" title="PDF preview" />
      <div className="flex justify-between gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={creating}>
          חזרה לעריכה
        </Button>
        <Button size="sm" disabled={creating} onClick={onConfirm}>
          {creating ? 'שומר…' : 'שמור כטיוטה'}
        </Button>
      </div>
    </div>
  );
}
