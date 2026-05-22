import type { LlmChatOptions, LlmChatResult, LlmMessage } from '../types';
import type { LlmProvider } from './base.provider';

/**
 * Mock provider for tests and local dev when no API keys are configured.
 * Returns deterministic JSON or plain text based on the system prompt format
 * directive. Counts tokens as character/4 (rough proxy).
 */
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';
  readonly defaultModel = 'mock-fast';
  readonly isAvailable = true;

  // For tests to script specific responses.
  private static scripted: string[] = [];

  static pushResponse(content: string) {
    MockLlmProvider.scripted.push(content);
  }

  static reset() {
    MockLlmProvider.scripted = [];
  }

  static queuedCount(): number {
    return MockLlmProvider.scripted.length;
  }

  async chat(messages: LlmMessage[], opts: LlmChatOptions = {}): Promise<LlmChatResult> {
    const start = Date.now();

    let content: string;
    if (MockLlmProvider.scripted.length > 0) {
      content = MockLlmProvider.scripted.shift()!;
    } else if (opts.responseFormat === 'json') {
      // Default well-formed JSON answer for an agent reply.
      content = JSON.stringify({
        reply: 'תודה על פנייתך. אשמח לעזור — מה אזור החיפוש המועדף עליך?',
        actions: [],
      });
    } else {
      const last = [...messages].reverse().find((m) => m.role === 'user');
      content = `[mock] received: ${last?.content?.slice(0, 80) ?? ''}`;
    }

    const inputTokens = Math.ceil(messages.reduce((s, m) => s + m.content.length, 0) / 4);
    const outputTokens = Math.ceil(content.length / 4);

    return {
      content,
      usage: { inputTokens, outputTokens },
      model: opts.model ?? this.defaultModel,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  estimateCost(): number {
    return 0;
  }
}
