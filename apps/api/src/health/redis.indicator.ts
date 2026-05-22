import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import type { Env } from '../config/env.schema';

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(
    config: ConfigService<Env, true>,
    private readonly indicator: HealthIndicatorService,
  ) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }

  async isHealthy(key: string) {
    const check = this.indicator.check(key);
    try {
      if (this.client.status === 'wait' || this.client.status === 'end') {
        await this.client.connect();
      }
      const pong = await this.client.ping();
      if (pong !== 'PONG') {
        return check.down({ error: `Unexpected ping response: ${pong}` });
      }
      return check.up();
    } catch (err) {
      return check.down({ error: (err as Error).message });
    }
  }
}
