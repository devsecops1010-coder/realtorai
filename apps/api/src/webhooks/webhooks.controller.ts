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
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AgentOrchestratorService } from '../agents/orchestrator.service';
import type { WebhookContext } from '../whatsapp/types';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly orchestrator: AgentOrchestratorService,
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

    const results: Array<{ from: string; conversationId: string; replied: boolean }> = [];
    for (const msg of incoming) {
      try {
        const routing: { tenantId?: string; officeId?: string } = {};
        const officeIdHeader = headers['x-realtorai-office-id'];
        if (typeof officeIdHeader === 'string') routing.officeId = officeIdHeader;
        const out = await this.orchestrator.handleIncoming(msg, routing);
        results.push({ from: msg.from, conversationId: out.conversationId, replied: !!out.replyBody });
      } catch (err) {
        this.logger.error(`Agent handling failed for ${msg.from}: ${(err as Error).message}`);
      }
    }
    return { ok: true, processed: results.length, results };
  }

  /**
   * Web form lead intake. Body: { fullName, phone, email, intent, ..., officeId? }
   * Auth via shared secret header `x-realtorai-form-secret` matching env.
   */
  @Public()
  @Post('forms')
  @HttpCode(HttpStatus.CREATED)
  async formWebhook(@Body() body: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    // For MVP we don't implement a separate form provider; offices can POST directly
    // to /leads with a service token. Stub returns 200.
    return { ok: true, message: 'forms webhook stub', received: body };
  }
}
