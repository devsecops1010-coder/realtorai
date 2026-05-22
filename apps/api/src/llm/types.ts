export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmChatResult {
  content: string;
  usage: LlmUsage;
  model: string;
  provider: string;
  latencyMs: number;
}

export type LlmIntent = 'fast' | 'long' | 'quality';

export interface LlmRouteOptions extends LlmChatOptions {
  intent?: LlmIntent;
  tenantId: string;
  officeId?: string | null;
  agentId?: string | null;
  conversationId?: string | null;
}
