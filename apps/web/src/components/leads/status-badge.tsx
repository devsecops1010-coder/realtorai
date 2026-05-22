import { Badge } from '@/components/ui/badge';
import type { LeadStatus, LeadTemperature } from '@/lib/types';

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מוסמך',
  hot: 'חם',
  meeting_scheduled: 'פגישה נקבעה',
  not_relevant: 'לא רלוונטי',
  no_answer: 'לא ענה',
  opted_out: 'הסיר עצמו',
  handoff_to_human: 'הועבר למתווך',
};

const STATUS_VARIANT: Record<LeadStatus, Parameters<typeof Badge>[0]['variant']> = {
  new: 'secondary',
  contacted: 'outline',
  qualified: 'default',
  hot: 'hot',
  meeting_scheduled: 'success',
  not_relevant: 'cold',
  no_answer: 'warning',
  opted_out: 'destructive',
  handoff_to_human: 'default',
};

const TEMP_LABEL: Record<LeadTemperature, string> = { cold: 'קר', warm: 'פושר', hot: 'חם' };
const TEMP_VARIANT: Record<LeadTemperature, Parameters<typeof Badge>[0]['variant']> = {
  cold: 'cold',
  warm: 'warning',
  hot: 'hot',
};

export function StatusBadge({ value }: { value: LeadStatus }) {
  return <Badge variant={STATUS_VARIANT[value]}>{STATUS_LABEL[value]}</Badge>;
}

export function TempBadge({ value }: { value: LeadTemperature }) {
  return <Badge variant={TEMP_VARIANT[value]}>{TEMP_LABEL[value]}</Badge>;
}
