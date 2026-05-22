import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const check = this.indicator.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return check.up();
    } catch (err) {
      return check.down({ error: (err as Error).message });
    }
  }
}
