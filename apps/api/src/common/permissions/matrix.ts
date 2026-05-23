import { UserRole } from '@prisma/client';

/**
 * Permission evaluation result.
 *
 *  - `allow`         → the action is permitted outright
 *  - `deny`          → the action is forbidden
 *  - `approval`      → permitted only with a higher-role sign-off
 *                      (workflow not yet implemented — treated as `deny`
 *                      at the gate, but the API returns 423 so the UI
 *                      knows it could ask for an approval)
 *  - `conditional`   → permitted only if a per-user grant exists. Grants
 *                      table not yet implemented — treated as `deny`.
 */
export type PermissionResult = 'allow' | 'deny' | 'approval' | 'conditional';

/**
 * Every permission key the system recognises. Mirrors the action rows in
 * the web permissions matrix (`/team/permissions`). Add a new entry here
 * AND in the matrix below when introducing a new gated action.
 */
export type PermissionKey =
  // visibility (used by future Branch/District scoping work — not yet
  // wired into the Prisma extension)
  | 'see.system'
  | 'see.network'
  | 'see.district'
  | 'see.branch'
  | 'see.office'
  // users
  | 'user.manage'
  | 'user.invite'
  | 'user.changeRole'
  | 'user.disable'
  // leads
  | 'lead.view'
  | 'lead.update'
  | 'lead.reassign'
  | 'lead.delete'
  // properties
  | 'property.view'
  | 'property.create'
  | 'property.delete'
  // AI
  | 'ai.editScript'
  | 'ai.runTest'
  // marketing
  | 'marketing.launchCampaign'
  | 'marketing.viewResults'
  // finance
  | 'finance.viewCosts'
  | 'finance.setLlmBudget'
  | 'finance.viewBilling'
  | 'finance.exportReports'
  // mortgage
  | 'mortgage.handle'
  | 'mortgage.manageAdvisors';

type Matrix = Record<PermissionKey, Partial<Record<UserRole, PermissionResult>>>;

/**
 * Authoritative permission matrix for the platform. Defaults to `deny` for
 * any role not listed under a key — being explicit forces conscious
 * decisions when adding new roles or actions. `platform_owner` always wins
 * via `PermissionsService.evaluate` and is not listed here.
 */
export const PERMISSION_MATRIX: Matrix = {
  // visibility scopes
  'see.system':       { ceo: 'allow', deputy_ceo: 'allow' },
  'see.network':      { ceo: 'allow', deputy_ceo: 'allow', district_manager: 'allow' },
  'see.district':     { ceo: 'allow', deputy_ceo: 'allow', district_manager: 'allow', branch_manager: 'allow' },
  'see.branch':       { ceo: 'allow', deputy_ceo: 'allow', district_manager: 'allow', branch_manager: 'allow', office_owner: 'allow', office_manager: 'allow' },
  'see.office': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'conditional', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow', realtor: 'allow',
    mortgage_advisor: 'allow', marketing_manager: 'allow',
    secretary: 'allow', accountant: 'allow', viewer: 'allow',
  },

  // users
  'user.manage': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
  },
  'user.invite': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
  },
  'user.changeRole': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'approval', branch_manager: 'approval',
    office_owner: 'allow', office_manager: 'conditional',
  },
  'user.disable': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
  },

  // leads
  'lead.view': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow', realtor: 'allow',
    mortgage_advisor: 'conditional', marketing_manager: 'conditional',
    secretary: 'allow', viewer: 'allow',
  },
  'lead.update': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow', realtor: 'allow',
    mortgage_advisor: 'conditional',
    secretary: 'allow',
  },
  'lead.reassign': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow',
    secretary: 'allow',
  },
  'lead.delete': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'approval', branch_manager: 'approval',
    office_owner: 'allow', office_manager: 'approval',
  },

  // properties
  'property.view': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow', realtor: 'allow',
    mortgage_advisor: 'conditional', marketing_manager: 'allow',
    secretary: 'allow', viewer: 'allow',
  },
  'property.create': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow', realtor: 'allow',
    secretary: 'allow',
  },
  'property.delete': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'approval', branch_manager: 'approval',
    office_owner: 'allow', office_manager: 'approval',
  },

  // AI
  'ai.editScript': {
    ceo: 'allow', deputy_ceo: 'allow',
    office_owner: 'allow', office_manager: 'conditional',
    marketing_manager: 'conditional',
  },
  'ai.runTest': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow',
    marketing_manager: 'allow',
  },

  // marketing
  'marketing.launchCampaign': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'approval', branch_manager: 'approval',
    office_owner: 'allow', office_manager: 'approval',
    marketing_manager: 'allow',
  },
  'marketing.viewResults': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow',
    marketing_manager: 'allow', accountant: 'allow',
  },

  // finance
  'finance.viewCosts': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    accountant: 'allow',
  },
  'finance.setLlmBudget': {
    ceo: 'allow', deputy_ceo: 'allow',
    office_owner: 'allow',
  },
  'finance.viewBilling': {
    ceo: 'allow', deputy_ceo: 'allow',
    office_owner: 'allow', office_manager: 'conditional',
    accountant: 'allow',
  },
  'finance.exportReports': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow',
    marketing_manager: 'allow', accountant: 'allow',
  },

  // mortgage
  'mortgage.handle': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    team_lead: 'allow', realtor: 'allow',
    mortgage_advisor: 'allow',
    secretary: 'allow',
  },
  'mortgage.manageAdvisors': {
    ceo: 'allow', deputy_ceo: 'allow',
    district_manager: 'allow', branch_manager: 'allow',
    office_owner: 'allow', office_manager: 'allow',
    mortgage_advisor: 'conditional',
  },
};
