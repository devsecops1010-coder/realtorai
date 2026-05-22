import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AgentOrchestratorService } from '../agents/orchestrator.service';
import { QUEUES, type IncomingMessageJobData } from './queue-names';

/**
 * BullMQ worker for inbound WhatsApp/voice/web messages.
 *
 * The webhook endpoint enqueues a job and returns 200 immediately so the
 * upstream provider (Twilio/Meta/360dialog) doesn't time out and retry.
 * The actual LLM call + tool dispatch + outgoing reply happens here.
 */
@Processor(QUEUES.INCOMING_MESSAGE, { concurrency: 5 })
export class IncomingMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(IncomingMessageProcessor.name);

  constructor(private readonly orchestrator: AgentOrchestratorService) {
    super();
  }

  async process(job: Job<IncomingMessageJobData>): Promise<{ conversationId: string; replied: boolean }> {
    const start = Date.now();
    const { provider, providerMessageId, from, to, body, receivedAt, raw, routing } = job.data;

    this.logger.log(
      `[${job.id}] processing ${provider} message from=${from} to=${to ?? '?'} attempt=${job.attemptsMade + 1}`,
    );

    const incoming = {
      provider,
      providerMessageId,
      from,
      to,
      body,
      receivedAt: new Date(receivedAt),
      raw,
    };

    const result = await this.orchestrator.handleIncoming(incoming, routing ?? {});
    const elapsed = Date.now() - start;

    this.logger.log(
      `[${job.id}] done in ${elapsed}ms conversation=${result.conversationId} replied=${!!result.replyBody}`,
    );

    return { conversationId: result.conversationId, replied: !!result.replyBody };
  }
}
