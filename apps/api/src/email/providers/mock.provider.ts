import { Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider, SentEmail } from '../types';

/**
 * Dev/test email provider. Logs the payload (without leaking the body to
 * lower log levels) and captures sent messages in memory so e2e tests can
 * assert on them — same pattern as MockWhatsAppProvider.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';
  readonly isAvailable = true;
  private readonly logger = new Logger(MockEmailProvider.name);

  // Test-only access — e2e tests can read MockEmailProvider.sent[] to
  // assert on tokens that arrived "by email".
  static sent: EmailMessage[] = [];

  async send(msg: EmailMessage): Promise<SentEmail> {
    MockEmailProvider.sent.push(msg);
    this.logger.log(
      `mock email → to=${msg.to} category=${msg.category ?? 'system'} subject="${msg.subject}"`,
    );
    // Debug-level: the actual link so a dev running locally can copy it
    // straight from the journal without checking the DB.
    this.logger.debug(msg.text);
    return { provider: 'mock', providerId: null, sentAt: new Date() };
  }
}
