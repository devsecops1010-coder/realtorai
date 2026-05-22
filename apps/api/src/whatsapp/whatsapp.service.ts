import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsageEventType } from '@prisma/client';
import type { Env } from '../config/env.schema';
import { UsageEventsService } from '../llm/usage-events.service';
import { MockWhatsAppProvider } from './providers/mock.provider';
import { TwilioWhatsAppProvider } from './providers/twilio.provider';
import { MetaWhatsAppProvider } from './providers/meta.provider';
import { Dialog360WhatsAppProvider } from './providers/dialog360.provider';
import type { WhatsAppProvider } from './providers/base.provider';
import type { IncomingMessage, OutgoingMessage, SentMessage, WebhookContext } from './types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: WhatsAppProvider;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly usage: UsageEventsService,
  ) {
    this.provider = this.buildProvider();
    this.logger.log(`WhatsApp provider: ${this.provider.name}`);
  }

  get providerName(): string {
    return this.provider.name;
  }

  verifyChallenge(ctx: WebhookContext): string | null {
    return this.provider.verifyChallenge?.(ctx) ?? null;
  }

  parseIncoming(ctx: WebhookContext): IncomingMessage[] {
    if (!this.provider.verifyWebhook(ctx)) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }
    return this.provider.parseIncoming(ctx);
  }

  async send(
    tenantId: string,
    msg: OutgoingMessage,
    meta: { officeId?: string | null; conversationId?: string | null } = {},
  ): Promise<SentMessage> {
    const sent = await this.provider.sendMessage(msg);
    await this.usage.record({
      tenantId,
      officeId: meta.officeId,
      conversationId: meta.conversationId,
      type: UsageEventType.whatsapp_message,
      provider: sent.provider,
      quantity: 1,
      metadata: { direction: 'outbound', to: msg.to, providerId: sent.providerId },
    });
    return sent;
  }

  private buildProvider(): WhatsAppProvider {
    const choice = this.config.get('WHATSAPP_PROVIDER', { infer: true });
    switch (choice) {
      case 'twilio': {
        const sid = this.config.get('TWILIO_ACCOUNT_SID', { infer: true });
        const token = this.config.get('TWILIO_AUTH_TOKEN', { infer: true });
        const from = this.config.get('TWILIO_WHATSAPP_FROM', { infer: true });
        if (!sid || !token || !from) {
          this.logger.warn('Twilio config missing; falling back to Mock provider');
          return new MockWhatsAppProvider(this.config.get('WHATSAPP_WEBHOOK_SECRET', { infer: true }));
        }
        return new TwilioWhatsAppProvider(sid, token, from);
      }
      case 'meta': {
        const phoneId = this.config.get('META_PHONE_NUMBER_ID', { infer: true });
        const accessToken = this.config.get('META_ACCESS_TOKEN', { infer: true });
        const verifyToken = this.config.get('META_VERIFY_TOKEN', { infer: true });
        const appSecret = this.config.get('WHATSAPP_WEBHOOK_SECRET', { infer: true });
        if (!phoneId || !accessToken || !verifyToken) {
          this.logger.warn('Meta config missing; falling back to Mock provider');
          return new MockWhatsAppProvider(appSecret);
        }
        return new MetaWhatsAppProvider(phoneId, accessToken, verifyToken, appSecret);
      }
      case 'dialog360': {
        const apiKey = this.config.get('DIALOG360_API_KEY', { infer: true });
        const baseUrl = this.config.get('DIALOG360_BASE_URL', { infer: true });
        if (!apiKey) {
          this.logger.warn('360dialog config missing; falling back to Mock provider');
          return new MockWhatsAppProvider(this.config.get('WHATSAPP_WEBHOOK_SECRET', { infer: true }));
        }
        return new Dialog360WhatsAppProvider(apiKey, baseUrl);
      }
      default:
        return new MockWhatsAppProvider(this.config.get('WHATSAPP_WEBHOOK_SECRET', { infer: true }));
    }
  }
}
