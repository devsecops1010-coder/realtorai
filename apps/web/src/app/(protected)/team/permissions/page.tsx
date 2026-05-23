'use client';

import Link from 'next/link';
import { Check, X, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ROLE_SHORT_LABELS } from '@/lib/role-workspace';
import type { UserRole } from '@/lib/types';

// Permission cell values. Mirrors the spreadsheet you provided + a few extras
// (approval = needs sign-off by a higher role; conditional = depends on
// per-user grants we haven't built yet).
type Perm = 'yes' | 'no' | 'approval' | 'conditional';

const PERM_LABEL: Record<Perm, string> = {
  yes: 'כן',
  no: 'לא',
  approval: 'אישור',
  conditional: 'לפי הרשאה',
};

const PERM_STYLE: Record<Perm, string> = {
  yes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  no: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
  approval: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  conditional: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
};

interface Action {
  key: string;
  label: string;
  group: 'visibility' | 'users' | 'leads' | 'properties' | 'ai' | 'marketing' | 'finance' | 'mortgage';
}

const ACTIONS: Action[] = [
  // visibility
  { key: 'see_system', label: 'לראות כל המערכת', group: 'visibility' },
  { key: 'see_network', label: 'לראות כל הרשת', group: 'visibility' },
  { key: 'see_district', label: 'לראות כל המחוז', group: 'visibility' },
  { key: 'see_branch', label: 'לראות כל הסניף', group: 'visibility' },
  { key: 'see_office', label: 'לראות כל המשרד', group: 'visibility' },
  // users
  { key: 'manage_users', label: 'לנהל משתמשים', group: 'users' },
  { key: 'invite_user', label: 'להזמין משתמש חדש', group: 'users' },
  { key: 'change_role', label: 'לשנות תפקיד משתמש', group: 'users' },
  { key: 'disable_user', label: 'לנטרל משתמש', group: 'users' },
  // leads
  { key: 'view_lead', label: 'לראות ליד', group: 'leads' },
  { key: 'update_lead', label: 'לעדכן ליד', group: 'leads' },
  { key: 'reassign_lead', label: 'להעביר ליד למתווך אחר', group: 'leads' },
  { key: 'delete_lead', label: 'למחוק ליד', group: 'leads' },
  // properties
  { key: 'view_property', label: 'לראות נכסים', group: 'properties' },
  { key: 'create_property', label: 'להוסיף נכס', group: 'properties' },
  { key: 'delete_property', label: 'למחוק נכס', group: 'properties' },
  // AI
  { key: 'edit_ai_script', label: 'לשנות תסריט AI', group: 'ai' },
  { key: 'run_agent_test', label: 'להפעיל סוכן בדיקה', group: 'ai' },
  // marketing
  { key: 'launch_campaign', label: 'להפעיל קמפיין', group: 'marketing' },
  { key: 'view_campaign_results', label: 'לראות תוצאות קמפיין', group: 'marketing' },
  // finance
  { key: 'view_costs', label: 'לראות עלויות', group: 'finance' },
  { key: 'set_llm_budget', label: 'להגדיר תקציב LLM חודשי', group: 'finance' },
  { key: 'view_billing', label: 'לראות חשבוניות', group: 'finance' },
  { key: 'export_reports', label: 'ייצוא דוחות (CSV)', group: 'finance' },
  // mortgage
  { key: 'handle_mortgage', label: 'לטפל בלקוחות משכנתאות', group: 'mortgage' },
  { key: 'manage_advisors', label: 'לנהל יועצי משכנתא', group: 'mortgage' },
];

const GROUP_LABEL: Record<Action['group'], string> = {
  visibility: 'נראות והיקף',
  users: 'משתמשים',
  leads: 'לידים',
  properties: 'נכסים',
  ai: 'סוכני AI',
  marketing: 'שיווק',
  finance: 'כספים ועלויות',
  mortgage: 'משכנתאות',
};

// Columns shown in the matrix. Platform_owner / platform_admin are hidden
// (they're internal). Order matches a typical org-chart top→bottom. Labels
// come from ROLE_SHORT_LABELS in role-workspace.ts so adding a new role only
// requires touching that file.
const COLUMN_ROLES: UserRole[] = [
  'ceo',
  'deputy_ceo',
  'district_manager',
  'branch_manager',
  'office_owner',
  'office_manager',
  'team_lead',
  'realtor',
  'mortgage_advisor',
  'marketing_manager',
  'secretary',
  'accountant',
  'viewer',
];

const ROLE_COLUMNS = COLUMN_ROLES.map((role) => ({
  role,
  short: ROLE_SHORT_LABELS[role],
}));

// The permission matrix. Each entry: action.key → role → Perm. Encodes the
// design intent ("what each role *should* be able to do") — not yet enforced
// in the API guards. Use this table as the spec when wiring permissions.
const MATRIX: Record<string, Partial<Record<UserRole, Perm>>> = {
  // visibility
  see_system:           { ceo: 'yes', deputy_ceo: 'yes' },
  see_network:          { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes' },
  see_district:         { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes' },
  see_branch:           { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes' },
  see_office:           { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'conditional', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'yes', mortgage_advisor: 'yes', marketing_manager: 'yes', secretary: 'yes', accountant: 'yes', viewer: 'yes' },
  // users
  manage_users:         { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes' },
  invite_user:          { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes' },
  change_role:          { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'approval', branch_manager: 'approval', office_owner: 'yes', office_manager: 'conditional' },
  disable_user:         { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes' },
  // leads
  view_lead:            { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'yes', mortgage_advisor: 'conditional', marketing_manager: 'conditional', secretary: 'yes', accountant: 'no', viewer: 'yes' },
  update_lead:          { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'yes', mortgage_advisor: 'conditional', marketing_manager: 'no', secretary: 'yes', accountant: 'no', viewer: 'no' },
  reassign_lead:        { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'yes', accountant: 'no', viewer: 'no' },
  delete_lead:          { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'approval', branch_manager: 'approval', office_owner: 'yes', office_manager: 'approval', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'no', accountant: 'no', viewer: 'no' },
  // properties
  view_property:        { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'yes', mortgage_advisor: 'conditional', marketing_manager: 'yes', secretary: 'yes', accountant: 'no', viewer: 'yes' },
  create_property:      { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'yes', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'yes', accountant: 'no', viewer: 'no' },
  delete_property:      { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'approval', branch_manager: 'approval', office_owner: 'yes', office_manager: 'approval', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'no', accountant: 'no', viewer: 'no' },
  // AI
  edit_ai_script:       { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'no', branch_manager: 'no', office_owner: 'yes', office_manager: 'conditional', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'conditional', secretary: 'no', accountant: 'no', viewer: 'no' },
  run_agent_test:       { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'yes', secretary: 'no', accountant: 'no', viewer: 'no' },
  // marketing
  launch_campaign:      { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'approval', branch_manager: 'approval', office_owner: 'yes', office_manager: 'approval', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'yes', secretary: 'no', accountant: 'no', viewer: 'no' },
  view_campaign_results:{ ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'yes', secretary: 'no', accountant: 'yes', viewer: 'no' },
  // finance
  view_costs:           { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'no', accountant: 'yes', viewer: 'no' },
  set_llm_budget:       { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'no', branch_manager: 'no', office_owner: 'yes', office_manager: 'no', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'no', accountant: 'no', viewer: 'no' },
  view_billing:         { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'no', branch_manager: 'no', office_owner: 'yes', office_manager: 'conditional', team_lead: 'no', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'no', secretary: 'no', accountant: 'yes', viewer: 'no' },
  export_reports:       { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'no', mortgage_advisor: 'no', marketing_manager: 'yes', secretary: 'no', accountant: 'yes', viewer: 'no' },
  // mortgage
  handle_mortgage:      { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'yes', realtor: 'yes', mortgage_advisor: 'yes', marketing_manager: 'no', secretary: 'yes', accountant: 'no', viewer: 'no' },
  manage_advisors:      { ceo: 'yes', deputy_ceo: 'yes', district_manager: 'yes', branch_manager: 'yes', office_owner: 'yes', office_manager: 'yes', team_lead: 'no', realtor: 'no', mortgage_advisor: 'conditional', marketing_manager: 'no', secretary: 'no', accountant: 'no', viewer: 'no' },
};

function cellOf(actionKey: string, role: UserRole): Perm {
  return MATRIX[actionKey]?.[role] ?? 'no';
}

export default function PermissionsMatrixPage() {
  const groups = Array.from(new Set(ACTIONS.map((a) => a.group)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/team"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            חזרה לצוות
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">מטריצת הרשאות</h1>
          <p className="text-muted-foreground mt-1">מה כל תפקיד יכול לעשות במערכת</p>
        </div>
        <Legend />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b">
                <th className="text-right p-3 font-semibold sticky right-0 bg-card min-w-[14rem]">
                  פעולה
                </th>
                {ROLE_COLUMNS.map((c) => (
                  <th key={c.role} className="p-2 font-semibold text-center text-xs whitespace-nowrap">
                    {c.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupRows key={group} group={group} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 flex gap-3 items-start text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-sky-500" />
          <div>
            הטבלה היא מפת ההרשאות המתוכננת. כרגע ה-API אוכף רק חלק מהן
            (office_owner / office_manager לניהול משתמשים, scope per tenant). השאר —
            תוויות תפקיד שמחכות לחיבור ל-RolesGuard. ההרשאה <strong>"לפי הרשאה"</strong>{' '}
            תלויה ב-grants ידניים שעוד לא בנויים, ו<strong>"אישור"</strong> תלוי
            ב-workflow אישורים שיתוסף בהמשך.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GroupRows({ group }: { group: Action['group'] }) {
  const actions = ACTIONS.filter((a) => a.group === group);
  return (
    <>
      <tr>
        <td
          colSpan={ROLE_COLUMNS.length + 1}
          className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          {GROUP_LABEL[group]}
        </td>
      </tr>
      {actions.map((a) => (
        <tr key={a.key} className="border-b hover:bg-muted/30 transition-colors">
          <td className="p-3 sticky right-0 bg-card font-medium text-right whitespace-nowrap">
            {a.label}
          </td>
          {ROLE_COLUMNS.map((c) => {
            const perm = cellOf(a.key, c.role);
            return (
              <td key={c.role} className="p-1.5 text-center">
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-md text-xs font-semibold',
                    PERM_STYLE[perm],
                  )}
                >
                  {PERM_LABEL[perm]}
                </span>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className={cn('px-2 py-1 rounded-md flex items-center gap-1', PERM_STYLE.yes)}>
        <Check className="h-3 w-3" /> מאופשר
      </span>
      <span className={cn('px-2 py-1 rounded-md flex items-center gap-1', PERM_STYLE.no)}>
        <X className="h-3 w-3" /> חסום
      </span>
      <span className={cn('px-2 py-1 rounded-md flex items-center gap-1', PERM_STYLE.approval)}>
        <AlertCircle className="h-3 w-3" /> דורש אישור
      </span>
      <span className={cn('px-2 py-1 rounded-md flex items-center gap-1', PERM_STYLE.conditional)}>
        <Info className="h-3 w-3" /> לפי הרשאה ידנית
      </span>
    </div>
  );
}
