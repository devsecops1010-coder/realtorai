import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditOptions {
  action: string;
  targetType?: string;
  /**
   * If true, audit even if the handler throws (records failure).
   * Default: true. Failure entries get `action.failed` suffix.
   */
  auditFailures?: boolean;
}

export const Audit = (action: string, opts: Omit<AuditOptions, 'action'> = {}) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, auditFailures: true, ...opts });
