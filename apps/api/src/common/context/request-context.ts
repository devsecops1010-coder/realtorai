import { ClsServiceManager, ClsStore } from 'nestjs-cls';
import type { UserRole } from '@prisma/client';

export interface RequestContextData extends ClsStore {
  tenantId?: string;
  userId?: string;
  officeId?: string | null;
  role?: UserRole;
  requestId?: string;
  isUnscoped?: boolean;
}

const CTX_KEYS = {
  tenantId: 'tenantId',
  userId: 'userId',
  officeId: 'officeId',
  role: 'role',
  requestId: 'requestId',
  isUnscoped: 'isUnscoped',
} as const;

export const RequestContext = {
  set(data: Partial<RequestContextData>): void {
    const cls = ClsServiceManager.getClsService<RequestContextData>();
    for (const [k, v] of Object.entries(data)) {
      cls.set(k as keyof RequestContextData, v as never);
    }
  },

  get(): RequestContextData {
    const cls = ClsServiceManager.getClsService<RequestContextData>();
    return {
      tenantId: cls.get(CTX_KEYS.tenantId),
      userId: cls.get(CTX_KEYS.userId),
      officeId: cls.get(CTX_KEYS.officeId),
      role: cls.get(CTX_KEYS.role),
      requestId: cls.get(CTX_KEYS.requestId),
      isUnscoped: cls.get(CTX_KEYS.isUnscoped),
    };
  },

  getTenantId(): string | undefined {
    return ClsServiceManager.getClsService<RequestContextData>().get(CTX_KEYS.tenantId);
  },

  getUserId(): string | undefined {
    return ClsServiceManager.getClsService<RequestContextData>().get(CTX_KEYS.userId);
  },

  getRole(): UserRole | undefined {
    return ClsServiceManager.getClsService<RequestContextData>().get(CTX_KEYS.role);
  },

  isUnscoped(): boolean {
    return Boolean(ClsServiceManager.getClsService<RequestContextData>().get(CTX_KEYS.isUnscoped));
  },

  runUnscoped<T>(fn: () => T): T {
    const cls = ClsServiceManager.getClsService<RequestContextData>();
    return cls.runWith({ ...cls.get(), [CTX_KEYS.isUnscoped]: true } as RequestContextData, fn);
  },
};
