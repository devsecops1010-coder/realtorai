import type { IncomingMessage, OutgoingMessage, SentMessage, WebhookContext } from '../types';

export interface WhatsAppProvider {
  readonly name: string;
  /** Returns true if the webhook signature is valid (or scheme accepts unsigned). */
  verifyWebhook(ctx: WebhookContext): boolean;
  /** Extract zero-or-more incoming messages from the webhook payload. */
  parseIncoming(ctx: WebhookContext): IncomingMessage[];
  /** Send an outgoing message. */
  sendMessage(msg: OutgoingMessage): Promise<SentMessage>;
  /** Some providers (Meta Cloud) require a verification handshake on first webhook setup. */
  verifyChallenge?(ctx: WebhookContext): string | null;
}
