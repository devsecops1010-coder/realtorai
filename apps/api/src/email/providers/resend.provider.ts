import { Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider, SentEmail } from '../types';

/**
 * Resend (resend.com) provider. Chosen for the closed beta because their
 * domain-verification UX is the smoothest and the free tier covers our
 * transactional volume comfortably (3,000/mo at the time of writing).
 *
 * Swap to Postmark / SES later by adding another provider class — the
 * EmailService factory picks based on EMAIL_PROVIDER env.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  readonly isAvailable = true;
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: EmailMessage): Promise<SentEmail> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        tags: msg.category ? [{ name: 'category', value: msg.category }] : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend ${res.status}: ${body}`);
      throw new Error(`Resend send failed: ${res.status}`);
    }
    const data = (await res.json()) as { id: string };
    return { provider: 'resend', providerId: data.id, sentAt: new Date() };
  }
}
