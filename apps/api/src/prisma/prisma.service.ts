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
}
