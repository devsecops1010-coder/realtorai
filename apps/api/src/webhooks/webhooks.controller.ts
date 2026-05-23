import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AgentOrchestratorService } from '../agents/orchestrator.service';
import type { WebhookContext } from '../whatsapp/types';
import { QUEUES, type IncomingMessageJobData } from '../queues/queue-names';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly orchestrator: AgentOrchestratorService,
    @InjectQueue(QUEUES.INCOMING_MESSAGE) private readonly incomingQueue: Queue<IncomingMessageJobData>,
  ) {}

  /**
   * Meta Cloud API verification handshake.
   * Other providers ignore GET.
   */
  @Public()
  @Get('whatsapp')
  whatsappVerify(@Query() query: Record<string, string>, @Res() res: Response) {
    const challenge = this.whatsapp.verifyChallenge({
      headers: {},
      body: {},
      query,
    });
    if (challenge !== null) {
      res.status(HttpStatus.OK).type('text/plain').send(challenge);
      return;
    }
    res.status(HttpStatus.OK).send('ok');
  }

  /**
   * Incoming WhatsApp messages. Returns 200 immediately so the provider
   * doesn't retry; agent processing happens inline for MVP (move to queue
   * in Sprint 4).
   */
  @Public()
  // Generous per-IP limit — real WhatsApp providers (Meta, Twilio) come
  // from a small range of IPs and can burst hard during campaign sends.
  // 120/min is enough headroom while still rejecting obvious abuse.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  async whatsappWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const ctx: WebhookContext = {
      headers,
      body,
      // raw body would be needed for HMAC validation in Meta; populate when raw body middleware is added.
      rawBody: undefined,
    };

    let incoming;
    try {
      incoming = this.whatsapp.parseIncoming(ctx);
    } catch (err) {
      this.logger.warn(`Webhook rejected: ${(err as Error).message}`);
      return { ok: false, error: 'invalid_signature' };
    }

    // Optional sync mode for tests; default is async via BullMQ.
    const syncFlag = headers['x-realtorai-sync'];
    const runSync = process.env.NODE_ENV === 'test' || syncFlag === '1' || syncFlag === 'true';

    const routing: { tenantId?: string; officeId?: string } = {};
    const officeIdHeader = headers['x-realtorai-office-id'];
    if (typeof officeIdHeader === 'string') routing.officeId = officeIdHeader;

    if (runSync) {
      const results: Array<{ from: string; conversationId: string; replied: boolean }> = [];
      for (const msg of incoming) {
        try {
          const out = await this.orchestrator.handleIncoming(msg, routing);
          results.push({ from: msg.from, conversationId: out.conversationId, replied: !!out.replyBody });
        } catch (err) {
          this.logger.error(`Agent handling failed for ${msg.from}: ${(err as Error).message}`);
        }
      }
      return { ok: true, processed: results.length, results, async: false };
    }

    // Async: enqueue each message and return immediately.
    const queued: Array<{ from: string; jobId: string }> = [];
    for (const msg of incoming) {
      try {
        const job = await this.incomingQueue.add(
          'incoming',
          {
            provider: msg.provider,
            providerMessageId: msg.providerMessageId,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            receivedAt: msg.receivedAt.toISOString(),
            raw: msg.raw,
            routing,
          },
          { jobId: `${msg.provider}-${msg.providerMessageId}` },
        );
        queued.push({ from: msg.from, jobId: job.id ?? '' });
      } catch (err) {
        this.logger.error(`Failed to enqueue webhook for ${msg.from}: ${(err as Error).message}`);
      }
    }
    return { ok: true, processed: queued.length, queued, async: true };
  }

  /**
   * Web form lead intake. Body: { fullName, phone, email, intent, ..., officeId? }
   * Auth via shared secret header `x-realtorai-form-secret` matching env.
   */
  @Public()
  // Tighter than the WhatsApp webhook — form leads come one at a time from
  // landing pages, so 30/min is plenty. Anything higher smells like a bot.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('forms')
  @HttpCode(HttpStatus.CREATED)
  async formWebhook(@Body() body: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    // For MVP we don't implement a separate form provider; offices can POST directly
    // to /leads with a service token. Stub returns 200.
    return { ok: true, message: 'forms webhook stub', received: body };
  }
}
