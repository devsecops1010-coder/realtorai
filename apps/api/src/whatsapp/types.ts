export interface OutgoingMessage {
  to: string; // E.164 phone, without "whatsapp:" prefix
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SentMessage {
  providerId: string;
  provider: string;
  sentAt: Date;
}

export interface IncomingMessage {
  provider: string;
  providerMessageId: string;
  from: string; // sender phone
  to?: string; // our number (optional)
  body: string;
  receivedAt: Date;
  raw: unknown;
}

export interface WebhookContext {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody?: string;
  query?: Record<string, string | string[] | undefined>;
}
