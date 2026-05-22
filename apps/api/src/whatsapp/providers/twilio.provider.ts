import { Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { WhatsAppProvider } from './base.provider';
import type { IncomingMessage, OutgoingMessage, SentMessage, WebhookContext } from '../types';

/**
 * Twilio WhatsApp provider.
 * Outgoing: Twilio's Messages API with whatsapp:+<phone> addressing.
 * Incoming: Twilio webhook sends `From=whatsapp:+...`, `Body=...`, `MessageSid=...`.
 * Signature: X-Twilio-Signature header validated against URL+body.
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger('TwilioWhatsApp');
  readonly name = 'twilio';

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
  ) {}

  verifyWebhook(ctx: WebhookContext): boolean {
    const signature = ctx.headers['x-twilio-signature'];
    if (!signature || typeof signature !== 'string') return false;
    // Twilio's signature is HMAC-SHA1 of (url + sorted form-encoded body).
    const url = (ctx.headers['x-forwarded-proto'] ?? 'https') + '://' +
      (ctx.headers['host'] ?? '') + (ctx.headers['x-original-url'] ?? '/webhooks/whatsapp');
    const body = ctx.body as Record<string, string>;
    const sortedKeys = Object.keys(body).sort();
    const data = url + sortedKeys.map((k) => `${k}${body[k]}`).join('');
    const expected = createHmac('sha1', this.authToken).update(data).digest('base64');
    return expected === signature;
  }

  parseIncoming(ctx: WebhookContext): IncomingMessage[] {
    const body = ctx.body as Record<string, string>;
    if (!body?.From || !body?.Body) return [];
    return [
      {
        provider: this.name,
        providerMessageId: body.MessageSid ?? `twilio-${Date.now()}`,
        from: body.From.replace(/^whatsapp:/, ''),
        to: body.To?.replace(/^whatsapp:/, ''),
        body: body.Body,
        receivedAt: new Date(),
        raw: body,
      },
    ];
  }

  async sendMessage(msg: OutgoingMessage): Promise<SentMessage> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      From: `whatsapp:${this.from}`,
      To: `whatsapp:${msg.to}`,
      Body: msg.body,
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Twilio send failed ${res.status}: ${errBody.slice(0, 500)}`);
    }
    const data = (await res.json()) as { sid: string };
    return { providerId: data.sid, provider: this.name, sentAt: new Date() };
  }
}
