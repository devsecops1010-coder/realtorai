import { Logger } from '@nestjs/common';
import type { WhatsAppProvider } from './base.provider';
import type { IncomingMessage, OutgoingMessage, SentMessage, WebhookContext } from '../types';

/**
 * Mock provider: accepts any webhook with a simple shared secret in header
 * `x-realtorai-secret`, parses `{from, body}` directly from the body.
 * Outgoing messages are logged and a fake providerId is returned.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger('MockWhatsApp');
  readonly name = 'mock';
  static sent: SentMessage[] = [];

  constructor(private readonly secret?: string) {}

  verifyWebhook(ctx: WebhookContext): boolean {
    if (!this.secret) return true;
    const got = ctx.headers['x-realtorai-secret'];
    return got === this.secret;
  }

  parseIncoming(ctx: WebhookContext): IncomingMessage[] {
    const body = ctx.body as { from?: string; body?: string; messageId?: string };
    if (!body?.from || !body?.body) return [];
    return [
      {
        provider: this.name,
        providerMessageId: body.messageId ?? `mock-${Date.now()}`,
        from: body.from,
        body: body.body,
        receivedAt: new Date(),
        raw: body,
      },
    ];
  }

  async sendMessage(msg: OutgoingMessage): Promise<SentMessage> {
    const sent: SentMessage = {
      providerId: `mock-out-${Date.now()}`,
      provider: this.name,
      sentAt: new Date(),
    };
    this.logger.log(`[mock] → ${msg.to}: ${msg.body.slice(0, 80)}`);
    MockWhatsAppProvider.sent.push(sent);
    return sent;
  }
}
