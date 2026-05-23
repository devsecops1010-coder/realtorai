import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import type { Env } from '../config/env.schema';

/**
 * Web Push delivery service.
 *
 * We avoid hard-coding a runtime dependency on the `web-push` npm package so
 * that the API still boots in environments where VAPID hasn't been
 * configured. The package is loaded lazily inside `send()` via a guarded
 * dynamic import — if it's missing we just log + skip.
 *
 * Subscription lifecycle:
 *   1. Browser calls `pushManager.subscribe()` → produces a `PushSubscription`
 *      with { endpoint, keys: { p256dh, auth } }.
 *   2. Frontend POSTs that to /push/subscribe. We upsert on (userId, endpoint).
 *   3. When the server wants to push, it loads matching subscriptions and
 *      iterates `webpush.sendNotification(...)`.
 *   4. If a send fails with 410 Gone, the subscription is dead — we delete
 *      the row so we don't keep retrying.
 */

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  // Lazy-initialized so the API can start without VAPID configured. We set
  // `webpush.setVapidDetails` the first time a send is attempted.
  private webpushInstance: any | null = null;
  private vapidReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Returns the public VAPID key for the frontend `pushManager.subscribe()`
   * call. Null if VAPID is unconfigured — the UI hides the enable button.
   */
  getPublicKey(): string | null {
    return this.config.get('VAPID_PUBLIC_KEY', { infer: true }) || null;
  }

  /** Persist a new subscription for the current user. Idempotent on (userId, endpoint). */
  async subscribe(args: {
    userId: string;
    tenantId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) {
    return this.prisma.scoped.pushSubscription.upsert({
      where: { userId_endpoint: { userId: args.userId, endpoint: args.endpoint } },
      create: {
        // tenantId is also injected by the tenant extension, but Prisma's
        // type for `upsert.create` doesn't know that — pass it explicitly
        // to satisfy the type system. Runtime is idempotent either way.
        tenantId: args.tenantId,
        userId: args.userId,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent ?? null,
      },
      update: {
        // The browser can rotate keys without changing the endpoint URL —
        // upsert keeps the row alive instead of orphaning a stale key pair.
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent ?? null,
      },
    });
  }

  /** Delete a subscription. Tolerates "not found" (already gone). */
  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.scoped.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  /**
   * Send a push to all of a user's subscriptions. Returns the count of
   * deliveries that actually went through. Dead subscriptions are pruned.
   *
   * NOTE: This silently no-ops if VAPID is unconfigured or if the `web-push`
   * package isn't installed. That's intentional — push is a nice-to-have, not
   * a critical path. Hot-lead alerts still write to the Notification table
   * and show in the in-app bell.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const webpush = await this.lazyInit();
    if (!webpush) return 0;

    // Bypass tenant scoping here because the caller (orchestrator,
    // scheduler) may not have a request context. The userId is the
    // authoritative identifier — and we read tenantId from the row itself
    // before sending.
    const subs = await this.prisma.unscoped().pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return 0;

    let delivered = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
        delivered++;
        // Track liveness so we can later prune subscriptions that go silent.
        await this.prisma
          .unscoped()
          .pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } });
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Gone — the user uninstalled the PWA or revoked permission. Prune.
          await this.prisma
            .unscoped()
            .pushSubscription.delete({ where: { id: sub.id } })
            .catch(() => undefined);
          this.logger.log(`Pruned dead subscription ${sub.id} (status ${statusCode})`);
        } else {
          this.logger.warn(`Push send failed for ${sub.id}: ${err?.message ?? err}`);
        }
      }
    }
    return delivered;
  }

  /**
   * Lazy require + VAPID setup. We never crash on missing module — that lets
   * dev environments work without web-push installed.
   */
  private async lazyInit(): Promise<any | null> {
    if (this.webpushInstance) return this.webpushInstance;
    const publicKey = this.config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('VAPID_PRIVATE_KEY', { infer: true });
    const subject = this.config.get('VAPID_SUBJECT', { infer: true });
    if (!publicKey || !privateKey || !subject) {
      // Quiet log — we don't want to spam every API boot. Logged once via
      // module init below.
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import('web-push');
      const webpush = (mod as any).default ?? mod;
      if (!this.vapidReady) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidReady = true;
        this.logger.log('VAPID configured; push enabled.');
      }
      this.webpushInstance = webpush;
      return webpush;
    } catch (err) {
      this.logger.warn(
        `web-push package not installed — push disabled. Install with: pnpm --filter api add web-push (${(err as Error).message})`,
      );
      return null;
    }
  }
}
