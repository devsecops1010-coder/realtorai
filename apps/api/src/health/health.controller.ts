import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { RedisHealthIndicator } from './redis.indicator';
import { PrismaHealthIndicator } from './prisma.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    private readonly prisma: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get('health')
  liveness() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prisma.isHealthy('db'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Public status snapshot — powers the /status web page + external uptime
   * monitors (UptimeRobot, BetterStack). Different from /ready in two ways:
   *
   *   1. Never throws 5xx — returns 200 with `status: 'degraded'` so the
   *      page can render a partial-outage banner. /ready returns 503 on
   *      any failure which is wrong for human-facing status.
   *   2. Includes per-component state so the page can label what's down.
   */
  @Public()
  @Get('status')
  async status() {
    const checks: Record<string, { ok: boolean; error?: string }> = {};
    try {
      await this.prisma.isHealthy('db');
      checks.db = { ok: true };
    } catch (e) {
      checks.db = { ok: false, error: (e as Error).message };
    }
    try {
      await this.redis.isHealthy('redis');
      checks.redis = { ok: true };
    } catch (e) {
      checks.redis = { ok: false, error: (e as Error).message };
    }
    const allOk = Object.values(checks).every((c) => c.ok);
    return {
      status: allOk ? 'operational' : 'degraded',
      uptime: process.uptime(),
      version: process.env.APP_VERSION ?? 'dev',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
