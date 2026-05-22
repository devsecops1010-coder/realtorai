// Types mirror what the API returns. Kept loose where Prisma enums add noise.

export type UserRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'office_owner'
  | 'office_manager'
  | 'realtor'
  | 'viewer';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'hot'
  | 'meeting_scheduled'
  | 'not_relevant'
  | 'no_answer'
  | 'opted_out'
  | 'handoff_to_human';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export type LeadIntent = 'buy' | 'sell' | 'rent' | 'list_for_rent' | 'unknown';

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled' | 'snoozed';
export type TaskType = 'followup' | 'call_lead' | 'visit' | 'send_property' | 'custom';

export type ConversationChannel = 'whatsapp' | 'voice' | 'web' | 'form' | 'manual';
export type ConversationStatus = 'active' | 'waiting' | 'closed' | 'handoff';

export interface AuthUser {
  id: string;
  tenantId: string;
  officeId: string | null;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface Office {
  id: string;
  name: string;
  city: string | null;
  areas: string[];
  phone: string | null;
  whatsappNumber: string | null;
  status: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  officeId: string;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string } | null;
  source: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  intent: LeadIntent;
  city: string | null;
  area: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  rooms: number | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  nextFollowupAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  leadId: string | null;
  lead?: { id: string; fullName: string | null; phone: string | null } | null;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string } | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ConversationListItem {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  startedAt: string;
  endedAt: string | null;
  handoffRequired: boolean;
  summary: string | null;
  lead: { id: string; fullName: string | null; phone: string | null; status: string } | null;
  agent: { id: string; type: string; name: string } | null;
  _count: { messages: number };
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'lead' | 'user' | 'ai_agent' | 'system';
  senderId: string | null;
  body: string;
  createdAt: string;
}

export interface ConversationDetail extends Omit<ConversationListItem, '_count'> {
  messages: Message[];
}

export type NotificationType =
  | 'hot_lead'
  | 'handoff_required'
  | 'followup_due'
  | 'daily_summary'
  | 'system';
export type NotificationSeverity = 'info' | 'warning' | 'alert';

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export type MortgageStatus =
  | 'unknown'
  | 'not_relevant'
  | 'needs_advisor'
  | 'referred'
  | 'contacted_by_advisor'
  | 'pre_approved'
  | 'declined';

export type MortgageReadiness = 'unknown' | 'not_ready' | 'partial' | 'ready' | 'approved';

export type ReferralStatus =
  | 'pending'
  | 'contacted'
  | 'qualified'
  | 'in_process'
  | 'closed_won'
  | 'closed_lost'
  | 'declined';

export interface MortgageAdvisor {
  id: string;
  fullName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  _count?: { referrals: number };
}

export interface MortgageProfile {
  id: string;
  leadId: string;
  estimatedPrice: number | null;
  estimatedEquity: number | null;
  monthlyIncome: number | null;
  hasPreApproval: boolean;
  preApprovalAmount: number | null;
  preApprovalBank: string | null;
  status: MortgageStatus;
  readiness: MortgageReadiness;
  readinessScore: number | null;
  consentToShareWithAdvisor: boolean;
  consentTimestamp: string | null;
  consentText: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: { id: string; fullName: string | null; phone: string | null; intent: string; city: string | null };
  referrals?: MortgageReferral[];
  _count?: { referrals: number };
}

export interface MortgageReferral {
  id: string;
  mortgageProfileId: string;
  advisorId: string;
  status: ReferralStatus;
  notes: string | null;
  referredAt: string;
  contactedAt: string | null;
  closedAt: string | null;
  advisor?: { id: string; fullName: string; company: string | null };
  profile?: { lead: { id: string; fullName: string | null; phone: string | null } };
}

export type PropertyDealType = 'sale' | 'rent';
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'needs_renovation' | 'for_demolition';
export type PropertyStatus = 'draft' | 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';

export interface Property {
  id: string;
  tenantId: string;
  officeId: string;
  ownerLeadId: string | null;
  ownerLead?: { id: string; fullName: string | null; phone: string | null } | null;
  dealType: PropertyDealType;
  city: string | null;
  area: string | null;
  street: string | null;
  rooms: number | null;
  floor: number | null;
  price: number | null;
  condition: PropertyCondition | null;
  status: PropertyStatus;
  notes: string | null;
  createdAt: string;
}

export interface ReportsToday {
  date: string;
  counts: {
    totalLeads: number;
    newLeadsToday: number;
    hotLeads: number;
    qualifiedLeads: number;
    meetingsScheduled: number;
    openTasks: number;
    tasksDueToday: number;
    handoffConvos: number;
    messagesToday: number;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  take: number;
  skip: number;
}
