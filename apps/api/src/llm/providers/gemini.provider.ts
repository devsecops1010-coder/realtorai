import type { LlmChatOptions, LlmChatResult, LlmMessage } from '../types';
import type { LlmProvider } from './base.provider';

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash-exp': { input: 0.1, output: 0.4 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
};

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  readonly defaultModel = 'gemini-1.5-flash';
  readonly isAvailable: boolean;

  constructor(private readonly apiKey: string | undefined) {
    this.isAvailable = !!apiKey;
  }

  async chat(messages: LlmMessage[], opts: LlmChatOptions = {}): Promise<LlmChatResult> {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY not set');
    const start = Date.now();
    const model = opts.model ?? this.defaultModel;

    // Gemini: system instruction is separate; messages roles are 'user' or 'model'.
    const system = messages.find((m) => m.role === 'system')?.content;
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxTokens ?? 1024,
          ...(opts.responseFormat === 'json' && { responseMimeType: 'application/json' }),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini error ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';

    return {
      content,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  estimateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number {
    const p = PRICING[model] ?? PRICING[this.defaultModel];
    return ((usage.inputTokens * p.input) + (usage.outputTokens * p.output)) / 1_000_000;
  }
}
