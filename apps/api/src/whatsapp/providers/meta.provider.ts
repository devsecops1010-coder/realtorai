import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WhatsAppProvider } from './base.provider';
import type { IncomingMessage, OutgoingMessage, SentMessage, WebhookContext } from '../types';

/**
 * Meta WhatsApp Cloud API provider.
 * Outgoing: POST to /<PHONE_NUMBER_ID>/messages with bearer access token.
 * Incoming: webhook with hub.signature_256 (HMAC-SHA256 with app secret).
 * Verification handshake: GET with hub.mode=subscribe, hub.verify_token, hub.challenge.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'meta';

  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
    private readonly verifyToken: string,
    private readonly appSecret?: string,
  ) {}

  verifyChallenge(ctx: WebhookContext): string | null {
    const q = ctx.query ?? {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === this.verifyToken) {
      return String(q['hub.challenge'] ?? '');
    }
    return null;
  }

  verifyWebhook(ctx: WebhookContext): boolean {
    if (!this.appSecret) return true;
    const sig = ctx.headers['x-hub-signature-256'];
    if (typeof sig !== 'string') return false;
    const expected = 'sha256=' +
      createHmac('sha256', this.appSecret).update(ctx.rawBody ?? '').digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  parseIncoming(ctx: WebhookContext): IncomingMessage[] {
    const body = ctx.body as {
      entry?: { changes?: { value?: { messages?: { id: string; from: string; text?: { body: string } }[] } }[] }[];
    };
    const out: IncomingMessage[] = [];
    for (const e of body.entry ?? []) {
      for (const c of e.changes ?? []) {
        for (const m of c.value?.messages ?? []) {
          if (!m.text?.body) continue;
          out.push({
            provider: this.name,
            providerMessageId: m.id,
            from: m.from,
            body: m.text.body,
            receivedAt: new Date(),
            raw: m,
          });
        }
      }
    }
    return out;
  }

  async sendMessage(msg: OutgoingMessage): Promise<SentMessage> {
    const url = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.to,
        type: 'text',
        text: { body: msg.body },
      }),
    });
    if (!res.ok) {
      throw new Error(`Meta WA send failed ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const data = (await res.json()) as { messages: { id: string }[] };
    return { providerId: data.messages[0]?.id ?? '', provider: this.name, sentAt: new Date() };
  }
}
