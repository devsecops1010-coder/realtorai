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
}
