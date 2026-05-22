export const QUEUES = {
  INCOMING_MESSAGE: 'incoming-message',
} as const;

export interface IncomingMessageJobData {
  provider: string;
  providerMessageId: string;
  from: string;
  to?: string;
  body: string;
  receivedAt: string; // ISO
  raw: unknown;
  routing?: { tenantId?: string; officeId?: string };
}
