import { Prisma } from '@prisma/client';
import { RequestContext } from '../common/context/request-context';

/**
 * Models that carry a required `tenantId`. The extension auto-injects
 * `where: { tenantId }` on reads/writes and `data: { tenantId }` on creates.
 *
 * Tenant itself is intentionally excluded — only platform_admin endpoints
 * touch it, and they must use `prisma.unscoped()`.
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  'Office',
  'User',
  'OptOut',
  'AuditLog',
  'RefreshToken',
  'Lead',
  'Agent',
  'AgentConfig',
  'Conversation',
  'Message',
  'Task',
  'UsageEvent',
]);

const TENANT_SCOPED_OPERATIONS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

const CREATE_OPERATIONS = new Set<string>(['create', 'createMany']);

class TenantScopeViolationError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Tenant scope violation: ${model}.${operation} called without tenantId in context. ` +
        `If this is admin code, use prisma.unscoped() and pass tenantId explicitly.`,
    );
    this.name = 'TenantScopeViolationError';
  }
}

/**
 * `RefreshToken` does not have a `tenantId` field directly, but is reachable
 * via its `user`. We scope it via the nested relation filter.
 */
function injectRefreshTokenWhere(args: any, tenantId: string): any {
  args.where = args.where ?? {};
  const existingUserFilter = args.where.user ?? {};
  args.where = {
    ...args.where,
    user: { ...existingUserFilter, tenantId },
  };
  return args;
}

export function createTenantExtension() {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          if (RequestContext.isUnscoped()) {
            return query(args);
          }

          const tenantId = RequestContext.getTenantId();

          if (TENANT_SCOPED_OPERATIONS.has(operation)) {
            if (!tenantId) {
              throw new TenantScopeViolationError(model, operation);
            }

            if (model === 'RefreshToken') {
              args = injectRefreshTokenWhere(args as any, tenantId);
            } else {
              const a = args as any;
              a.where = { ...(a.where ?? {}), tenantId };
            }
            return query(args);
          }

          if (CREATE_OPERATIONS.has(operation)) {
            if (model === 'RefreshToken') {
              // RefreshToken create is owned by AuthService, which sets userId
              // and we trust user.tenantId matches ctx (verified at user lookup).
              return query(args);
            }
            if (!tenantId) {
              throw new TenantScopeViolationError(model, operation);
            }
            const a = args as any;
            if (operation === 'createMany') {
              const data = Array.isArray(a.data) ? a.data : [a.data];
              a.data = data.map((d: any) => ({ tenantId, ...d }));
            } else {
              a.data = { tenantId, ...(a.data ?? {}) };
            }
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}
