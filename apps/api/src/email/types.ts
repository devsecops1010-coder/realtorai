// Email message shape. Providers translate this to their wire format.
// `text` is mandatory (deliverability + accessibility); `html` is optional
// but recommended for transactional emails.
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  // Tagged so logs/audit can group by purpose without leaking content.
  category?:
    | 'invite'
    | 'password_reset'
    | 'system'
    | 'signing_link'
    | 'otp'
    | 'signed'
    | 'tenant_suspended'
    | 'tenant_reactivated';
}

export interface SentEmail {
  provider: string;
  providerId: string | null; // null for Mock provider
  sentAt: Date;
}

export interface EmailProvider {
  readonly name: string;
  readonly isAvailable: boolean;
  send(msg: EmailMessage): Promise<SentEmail>;
}
