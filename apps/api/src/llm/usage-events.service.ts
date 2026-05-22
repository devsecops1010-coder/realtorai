import { Injectable, Logger } from '@nestjs/common';
import { UsageEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordUsageInput {
  tenantId: string;
  officeId?: string | null;
  agentId?: string | null;
  conversationId?: string | null;
  type: UsageEventType;
  provider?: string | null;
  quantity: number;
  costEstimate?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UsageEventsService {
  private readonly logger = new Logger(UsageEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordUsageInput): Promise<void> {
    try {
      await this.prisma.unscoped().usageEvent.create({
        data: {
          tenantId: input.tenantId,
          officeId: input.officeId ?? null,
          agentId: input.agentId ?? null,
          conversationId: input.conversationId ?? null,
          type: input.type,
          provider: input.provider ?? null,
          quantity: input.quantity,
          costEstimate: input.costEstimate ?? null,
          metadata: (input.metadata as object) ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error('Failed to record usage event', err);
    }
  }
}
