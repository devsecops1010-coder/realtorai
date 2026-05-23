import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';
import { RequestContext } from '../common/context/request-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private extendedClient!: PrismaClient;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    // The extension only intercepts queries — the public surface stays identical
    // to PrismaClient, so we can safely type it as such for ergonomic access.
    this.extendedClient = this.$extends(createTenantExtension()) as unknown as PrismaClient;
    this.logger.log('PrismaService connected with tenant-scope extension');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Tenant-scoped Prisma client. Use this for any business-logic query that
   * belongs to a tenant. The current tenant is taken from RequestContext (CLS).
   */
  get scoped(): PrismaClient {
    if (!this.extendedClient) {
      throw new Error('PrismaService not initialized yet');
    }
    return this.extendedClient;
  }

  /**
   * Unscoped Prisma client — bypasses tenant scoping. Use ONLY for:
   *   - Auth flows (login lookups, refresh token validation) where tenantId
   *     is being discovered, not enforced.
   *   - platform_admin endpoints that intentionally span tenants.
   *   - Audit log writes from the AuditInterceptor.
   *   - System tasks (migrations, seeds).
   *
   * Every caller MUST pass tenantId explicitly where applicable.
   */
  unscoped(): PrismaClient {
    return this;
  }

  /**
   * Run a callback with tenant scoping temporarily disabled.
   * Cleaner than `unscoped()` when you want to do a few admin reads and
   * then keep going with normal scoping.
   */
  withUnscoped<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
    return RequestContext.runUnscoped(() => fn(this));
  }

  /**
   * Belt-and-suspenders helper for code that intentionally crosses tenant
   * boundaries (platform_admin endpoints, system tasks). Runtime-asserts
   * the caller is a platform role before handing out the unscoped client.
   *
   * The HTTP route should ALREADY be protected by `@Roles(platform_admin)`
   * or `@RequirePermission('see.system')`. This is the second line — if
   * those guards are ever forgotten on a new endpoint, calling
   * `prisma.adminQuery()` from the service will throw rather than
   * silently exfiltrate cross-tenant data.
   *
   * Passing { systemTask: true } bypasses the role check — for cron jobs,
   * queue workers, and migrations where there's no user context.
   */
  adminQuery(opts: { systemTask?: boolean } = {}): PrismaClient {
    if (!opts.systemTask) {
      const role = RequestContext.getRole();
      if (role !== 'platform_admin' && role !== 'platform_owner') {
        throw new Error(
          `prisma.adminQuery() called by role=${role ?? 'none'} — only platform_admin / platform_owner are allowed without { systemTask: true }`,
        );
      }
    }
    return this;
  }
}
