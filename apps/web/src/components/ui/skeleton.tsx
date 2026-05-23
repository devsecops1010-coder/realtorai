// Skeleton placeholder. Single component, sized by the parent via className.
// Animation is via the existing `animate-pulse` Tailwind class — no JS, so
// React 19 doesn't have to re-render to keep the wave going.

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/60 dark:bg-muted/30',
        className,
      )}
      // aria-busy so screen readers announce "loading" rather than empty text.
      role="status"
      aria-busy="true"
      aria-label="טוען"
    />
  );
}

/**
 * Convenience: a table-row skeleton that matches the leads/properties/tasks
 * tables (7-8 cells). Use inside <TableBody> as a stand-in while `loading`.
 */
export function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-2 py-3">
          <Skeleton className="h-4 w-full max-w-32" />
        </td>
      ))}
    </tr>
  );
}
