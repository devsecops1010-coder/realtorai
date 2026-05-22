import { createHmac } from 'node:crypto';
import type { WhatsAppProvider } from './base.provider';
import type { IncomingMessage, OutgoingMessage, SentMessage, WebhookContext } from '../types';

/**
 * 360dialog On-Premise / Cloud API provider.
 * Outgoing: POST to <baseUrl>/v1/messages with header D360-API-KEY.
 * Incoming: shape mirrors Meta's webhook structure.
 */
export class Dialog360WhatsAppProvider implements WhatsAppProvider {
  readonly name = 'dialog360';

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://waba-v2.360dialog.io',
  ) {}

  verifyWebhook(ctx: WebhookContext): boolean {
    // 360dialog optionally signs with the API key — most setups skip signature.
    const sig = ctx.headers['x-360-signature'];
    if (!sig) return true;
    const expected = createHmac('sha256', this.apiKey).update(ctx.rawBody ?? '').digest('hex');
    return sig === expected;
  }

  parseIncoming(ctx: WebhookContext): IncomingMessage[] {
    // Same shape as Meta Cloud API.
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
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': this.apiKey,
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
      throw new Error(`360dialog send failed ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const data = (await res.json()) as { messages?: { id: string }[] };
    return { providerId: data.messages?.[0]?.id ?? '', provider: this.name, sentAt: new Date() };
  }
}
