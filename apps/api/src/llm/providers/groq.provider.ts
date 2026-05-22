import { Logger } from '@nestjs/common';
import type { LlmChatOptions, LlmChatResult, LlmMessage } from '../types';
import type { LlmProvider } from './base.provider';

// USD per 1M tokens — keep updated.
const PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
};

export class GroqProvider implements LlmProvider {
  private readonly logger = new Logger(GroqProvider.name);
  readonly name = 'groq';
  readonly defaultModel = 'llama-3.3-70b-versatile';
  readonly isAvailable: boolean;

  constructor(private readonly apiKey: string | undefined) {
    this.isAvailable = !!apiKey;
  }

  async chat(messages: LlmMessage[], opts: LlmChatOptions = {}): Promise<LlmChatResult> {
    if (!this.apiKey) throw new Error('GROQ_API_KEY not set');
    const start = Date.now();
    const model = opts.model ?? this.defaultModel;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.responseFormat === 'json' && { response_format: { type: 'json_object' } }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq error ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
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
