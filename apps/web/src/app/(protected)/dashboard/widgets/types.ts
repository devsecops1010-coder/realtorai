/**
 * Each widget on the dashboard is a self-contained React component. It owns
 * its own data fetching, loading state, and empty state. The layout module
 * (./layouts/index.ts) maps each WorkspaceKind to an ordered array of widget
 * keys; the dashboard page just iterates and renders.
 *
 * Widgets are intentionally prop-less so they can be re-rendered across the
 * app (e.g. team-leaderboard also lives on /team). Any data they need comes
 * from the API client + current user context.
 */
import type { ComponentType } from 'react';

export interface DashboardWidget {
  key: string;
  /** Rendered component. Receives no props (everything fetched inline). */
  Component: ComponentType;
  /** Optional: make the widget span 2 grid columns on lg+ screens. */
  fullWidth?: boolean;
}
