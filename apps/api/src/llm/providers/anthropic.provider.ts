import type { LlmChatOptions, LlmChatResult, LlmMessage } from '../types';
import type { LlmProvider } from './base.provider';

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
};

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly defaultModel = 'claude-sonnet-4-6';
  readonly isAvailable: boolean;

  constructor(private readonly apiKey: string | undefined) {
    this.isAvailable = !!apiKey;
  }

  async chat(messages: LlmMessage[], opts: LlmChatOptions = {}): Promise<LlmChatResult> {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    const start = Date.now();
    const model = opts.model ?? this.defaultModel;

    // Anthropic API uses a separate system prompt, not a system message.
    const system = messages.find((m) => m.role === 'system')?.content;
    const nonSystem = messages.filter((m) => m.role !== 'system');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        ...(system && { system }),
        messages: nonSystem,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      content: { type: string; text: string }[];
      usage: { input_tokens: number; output_tokens: number };
      model: string;
    };

    const content = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('');

    return {
      content,
      usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens },
      model: data.model ?? model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  estimateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number {
    const p = PRICING[model] ?? PRICING[this.defaultModel];
    return ((usage.inputTokens * p.input) + (usage.outputTokens * p.output)) / 1_000_000;
  }
}
