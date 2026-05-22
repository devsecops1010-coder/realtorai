import type { LlmChatOptions, LlmChatResult, LlmMessage } from '../types';

export interface LlmProvider {
  readonly name: string;
  readonly defaultModel: string;
  readonly isAvailable: boolean;
  chat(messages: LlmMessage[], opts?: LlmChatOptions): Promise<LlmChatResult>;
  estimateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number;
}
