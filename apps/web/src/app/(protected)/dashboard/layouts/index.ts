/**
 * Workspace → widget layout mapping.
 *
 * Each role maps to a `WorkspaceKind` (see lib/role-workspace.ts), and each
 * workspace gets an ordered list of widgets to show. Order matters — the
 * dashboard lays them out top-to-bottom, left-to-right.
 *
 * Adding a widget: import it, give it a key, list it here. The widget owns
 * its own permission gating (via the API returning 403) so a row showing up
 * for the wrong role just renders nothing.
 */
import type { WorkspaceKind } from '@/lib/role-workspace';
import type { DashboardWidget } from '../widgets/types';
import { LeadsOverviewWidget } from '../widgets/leads-overview';
import { TasksTodayWidget } from '../widgets/tasks-today';
import { PipelineFunnelWidget } from '../widgets/pipeline-funnel';
import { TeamLeaderboardWidget } from '../widgets/team-leaderboard';
import { NetworkRollupWidget } from '../widgets/network-rollup';
import { PlatformMrrWidget } from '../widgets/platform-mrr';
import { MortgagePipelineWidget } from '../widgets/mortgage-pipeline';
import { MarketingKpisWidget } from '../widgets/marketing-kpis';
import { OpsHandoffsWidget } from '../widgets/ops-handoffs';
import { FinanceUsageWidget } from '../widgets/finance-usage';

const W = {
  leadsOverview: { key: 'leads-overview', Component: LeadsOverviewWidget } satisfies DashboardWidget,
  tasksToday: { key: 'tasks-today', Component: TasksTodayWidget } satisfies DashboardWidget,
  pipelineFunnel: { key: 'pipeline-funnel', Component: PipelineFunnelWidget } satisfies DashboardWidget,
  teamLeaderboard: { key: 'team-leaderboard', Component: TeamLeaderboardWidget } satisfies DashboardWidget,
  networkRollup: { key: 'network-rollup', Component: NetworkRollupWidget } satisfies DashboardWidget,
  platformMrr: { key: 'platform-mrr', Component: PlatformMrrWidget } satisfies DashboardWidget,
  mortgagePipeline: { key: 'mortgage-pipeline', Component: MortgagePipelineWidget } satisfies DashboardWidget,
  marketingKpis: { key: 'marketing-kpis', Component: MarketingKpisWidget } satisfies DashboardWidget,
  opsHandoffs: { key: 'ops-handoffs', Component: OpsHandoffsWidget } satisfies DashboardWidget,
  financeUsage: { key: 'finance-usage', Component: FinanceUsageWidget } satisfies DashboardWidget,
};

export const WORKSPACE_WIDGETS: Record<WorkspaceKind, DashboardWidget[]> = {
  // Platform admins live in /admin most of the time. The dashboard gives
  // them a 30-second daily glance — MRR + network + handoffs.
  platform: [W.platformMrr, W.networkRollup, W.opsHandoffs, W.financeUsage],
  // Executives want the bigger picture: network rollup + funnel + finance.
  executive: [W.networkRollup, W.pipelineFunnel, W.financeUsage, W.teamLeaderboard, W.tasksToday],
  // Regional managers manage multiple offices — rollup + team + handoffs.
  regional: [W.networkRollup, W.teamLeaderboard, W.opsHandoffs, W.pipelineFunnel, W.tasksToday],
  // Office leadership: their office, their team.
  officeLeadership: [
    W.leadsOverview,
    W.teamLeaderboard,
    W.tasksToday,
    W.pipelineFunnel,
    W.mortgagePipeline,
  ],
  // Team lead: similar to leadership but more focused on the team itself.
  teamLead: [W.teamLeaderboard, W.leadsOverview, W.tasksToday, W.pipelineFunnel],
  // Salespeople: tasks first, then their leads.
  sales: [W.tasksToday, W.leadsOverview, W.pipelineFunnel],
  // Mortgage advisors: their queue, then tasks.
  mortgage: [W.mortgagePipeline, W.tasksToday, W.leadsOverview],
  // Marketing: source breakdown + funnel — outcome-focused.
  marketing: [W.marketingKpis, W.pipelineFunnel, W.leadsOverview],
  // Operations: handoffs + tasks. They unblock things.
  operations: [W.opsHandoffs, W.tasksToday, W.leadsOverview],
  // Finance / accounting: usage + revenue.
  finance: [W.financeUsage, W.platformMrr, W.leadsOverview],
  // Read-only: just the headline stats.
  viewer: [W.leadsOverview, W.pipelineFunnel],
};
