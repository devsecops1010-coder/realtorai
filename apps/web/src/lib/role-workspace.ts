import type { UserRole } from './types';

export type WorkspaceKind =
  | 'platform'
  | 'executive'
  | 'regional'
  | 'officeLeadership'
  | 'teamLead'
  | 'sales'
  | 'mortgage'
  | 'marketing'
  | 'operations'
  | 'finance'
  | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_owner: 'בעלי פלטפורמה',
  platform_admin: 'אדמין פלטפורמה',
  ceo: 'מנכ"ל',
  deputy_ceo: 'סמנכ"ל',
  district_manager: 'מנהל מחוז',
  branch_manager: 'מנהל סניף',
  office_owner: 'בעל משרד',
  office_manager: 'מנהל משרד',
  team_lead: 'ראש צוות',
  realtor: 'מתווך',
  mortgage_advisor: 'יועץ משכנתאות',
  marketing_manager: 'מנהל שיווק',
  secretary: 'מזכיר/ה',
  accountant: 'כספים',
  viewer: 'צופה',
};

// Compact labels used where horizontal space is scarce — matrix column
// headers, dense cards, mobile nav. Defaults to the full ROLE_LABELS entry
// for any role that doesn't need shortening.
export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  platform_owner: 'פלטפורמה',
  platform_admin: 'אדמין',
  ceo: 'מנכ"ל',
  deputy_ceo: 'סמנכ"ל',
  district_manager: 'מחוז',
  branch_manager: 'סניף',
  office_owner: 'בעלים',
  office_manager: 'מנהל',
  team_lead: 'ראש צוות',
  realtor: 'מתווך',
  mortgage_advisor: 'משכנתא',
  marketing_manager: 'שיווק',
  secretary: 'מזכירות',
  accountant: 'חשבונות',
  viewer: 'צופה',
};

export const PLATFORM_ROLES: UserRole[] = ['platform_owner', 'platform_admin'];
export const EXECUTIVE_ROLES: UserRole[] = ['ceo', 'deputy_ceo'];
export const REGIONAL_ROLES: UserRole[] = ['district_manager', 'branch_manager'];
export const OFFICE_LEADERSHIP_ROLES: UserRole[] = ['office_owner', 'office_manager'];
export const TEAM_LEAD_ROLES: UserRole[] = ['team_lead'];
export const SALES_ROLES: UserRole[] = ['realtor'];
export const MORTGAGE_ROLES: UserRole[] = ['mortgage_advisor'];
export const MARKETING_ROLES: UserRole[] = ['marketing_manager'];
export const OPERATIONS_ROLES: UserRole[] = ['secretary'];
export const FINANCE_ROLES: UserRole[] = ['accountant'];

export const ALL_ROLES: UserRole[] = [
  'platform_owner',
  'platform_admin',
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

export const MANAGEMENT_ROLES: UserRole[] = [
  ...PLATFORM_ROLES,
  ...EXECUTIVE_ROLES,
  ...REGIONAL_ROLES,
  ...OFFICE_LEADERSHIP_ROLES,
  ...TEAM_LEAD_ROLES,
];

export const OFFICE_VISIBILITY_ROLES: UserRole[] = [
  ...MANAGEMENT_ROLES,
  ...SALES_ROLES,
  ...MORTGAGE_ROLES,
  ...MARKETING_ROLES,
  ...OPERATIONS_ROLES,
  ...FINANCE_ROLES,
  'viewer',
];

export const TENANT_ASSIGNABLE_ROLES: UserRole[] = [
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

export const ASSIGNABLE_ROLE_OPTIONS = TENANT_ASSIGNABLE_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export interface RoleWorkspace {
  kind: WorkspaceKind;
  label: string;
  headline: string;
  focus: string;
  scope: string;
  tone: string;
}

export function isOneOf(role: UserRole | undefined, roles: readonly UserRole[]) {
  return Boolean(role && roles.includes(role));
}

export function getAssignableRoleOptions(actorRole: UserRole | undefined) {
  return ASSIGNABLE_ROLE_OPTIONS.filter(
    (option) => !(actorRole === 'office_manager' && option.value === 'office_owner'),
  );
}

export function getWorkspaceForRole(role: UserRole | undefined): RoleWorkspace {
  if (isOneOf(role, PLATFORM_ROLES)) {
    return {
      kind: 'platform',
      label: 'מרכז פלטפורמה',
      headline: 'שליטה על רשתות, משרדים ובריאות המערכת',
      focus: 'משרדים פעילים, שימוש, חריגות ואיכות שירות',
      scope: 'כל הפלטפורמה',
      tone: 'from-slate-900 via-slate-800 to-cyan-900 text-white',
    };
  }

  if (isOneOf(role, EXECUTIVE_ROLES)) {
    return {
      kind: 'executive',
      label: 'הנהלת רשת',
      headline: 'תמונת מצב ניהולית לכל הפעילות',
      focus: 'ביצועים, הכנסות, עומסים ומשרדים שצריכים תשומת לב',
      scope: 'רשת / הנהלה',
      tone: 'from-cyan-900 via-teal-800 to-emerald-800 text-white',
    };
  }

  if (isOneOf(role, REGIONAL_ROLES)) {
    return {
      kind: 'regional',
      label: 'ניהול מחוז וסניפים',
      headline: 'בקרה על סניפים, צוותים ולידים תקועים',
      focus: 'השוואת ביצועים, פגישות, שיחות פתוחות והעברות לטיפול',
      scope: 'מחוז / סניף',
      tone: 'from-sky-900 via-cyan-800 to-teal-700 text-white',
    };
  }

  if (isOneOf(role, OFFICE_LEADERSHIP_ROLES)) {
    return {
      kind: 'officeLeadership',
      label: 'ניהול משרד',
      headline: 'כל מה שבעל משרד צריך לראות בבוקר',
      focus: 'לידים חמים, משימות פתוחות, גיוס נכסים וביצועי צוות',
      scope: 'המשרד שלי',
      tone: 'from-teal-800 via-emerald-700 to-lime-700 text-white',
    };
  }

  if (isOneOf(role, TEAM_LEAD_ROLES)) {
    return {
      kind: 'teamLead',
      label: 'ניהול צוות',
      headline: 'סדר עדיפויות יומי לצוות המכירות',
      focus: 'מי צריך פולו-אפ, אילו לידים חמים ואיפה צריך התערבות',
      scope: 'הצוות שלי',
      tone: 'from-blue-900 via-sky-800 to-cyan-700 text-white',
    };
  }

  if (isOneOf(role, SALES_ROLES)) {
    return {
      kind: 'sales',
      label: 'מכירות ותיווך',
      headline: 'היום שלך מתחיל בלידים שדורשים טיפול',
      focus: 'שיחות בהעברה, לידים חמים, פגישות ומשימות להיום',
      scope: 'הלקוחות שלי',
      tone: 'from-amber-700 via-orange-700 to-rose-700 text-white',
    };
  }

  if (isOneOf(role, MORTGAGE_ROLES)) {
    return {
      kind: 'mortgage',
      label: 'משכנתאות',
      headline: 'ליווי לקוחות לקראת אישור ומימון',
      focus: 'פרופילי משכנתא, הסכמות, הפניות ולקוחות מוכנים',
      scope: 'לקוחות משכנתא',
      tone: 'from-emerald-900 via-teal-800 to-cyan-800 text-white',
    };
  }

  if (isOneOf(role, MARKETING_ROLES)) {
    return {
      kind: 'marketing',
      label: 'שיווק וצמיחה',
      headline: 'מבט על מקורות הלידים והנכסים לפרסום',
      focus: 'לידים חדשים, נכסים פעילים, שיחות וקמפיינים להמשך',
      scope: 'שיווק משרד',
      tone: 'from-fuchsia-900 via-rose-800 to-amber-700 text-white',
    };
  }

  if (isOneOf(role, OPERATIONS_ROLES)) {
    return {
      kind: 'operations',
      label: 'תפעול ומענה',
      headline: 'תפעול שוטף בלי פניות שנופלות בין הכיסאות',
      focus: 'שיחות פתוחות, משימות להיום, לידים חדשים ותיאומים',
      scope: 'בק אופיס',
      tone: 'from-indigo-900 via-blue-800 to-sky-700 text-white',
    };
  }

  if (isOneOf(role, FINANCE_ROLES)) {
    return {
      kind: 'finance',
      label: 'כספים ובקרה',
      headline: 'בקרה על פעילות, שימוש ונתוני משרד',
      focus: 'דוחות, שימוש, חריגות וייצוא נתונים',
      scope: 'כספים',
      tone: 'from-stone-900 via-slate-800 to-teal-900 text-white',
    };
  }

  return {
    kind: 'viewer',
    label: 'צפייה',
    headline: 'תצוגת מעקב שקטה לפעילות המשרד',
    focus: 'סטטוס לידים, נכסים, שיחות והתראות',
    scope: 'צפייה בלבד',
    tone: 'from-slate-800 via-slate-700 to-slate-600 text-white',
  };
}
