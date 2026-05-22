import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsageEventType } from '@prisma/client';
import type { Env } from '../config/env.schema';
import { UsageEventsService } from './usage-events.service';
import { MockLlmProvider } from './providers/mock.provider';
import { GroqProvider } from './providers/groq.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import type { LlmProvider } from './providers/base.provider';
import type { LlmChatResult, LlmMessage, LlmRouteOptions } from './types';

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);
  private readonly providers: Map<string, LlmProvider>;
  private readonly mock = new MockLlmProvider();

  constructor(
    config: ConfigService<Env, true>,
    private readonly usage: UsageEventsService,
  ) {
    this.providers = new Map<string, LlmProvider>([
      ['mock', this.mock],
      ['groq', new GroqProvider(config.get('GROQ_API_KEY', { infer: true }))],
      ['anthropic', new AnthropicProvider(config.get('ANTHROPIC_API_KEY', { infer: true }))],
      ['gemini', new GeminiProvider(config.get('GEMINI_API_KEY', { infer: true }))],
    ]);

    const available = Array.from(this.providers.values()).filter((p) => p.isAvailable);
    this.logger.log(`LLM providers ready: ${available.map((p) => p.name).join(', ')}`);
  }

  async chat(messages: LlmMessage[], opts: LlmRouteOptions): Promise<LlmChatResult> {
    const intent = opts.intent ?? 'fast';
    const order = this.routingOrder(intent);
    const errors: string[] = [];

    for (const name of order) {
      const provider = this.providers.get(name);
      if (!provider || !provider.isAvailable) continue;
      try {
        const result = await provider.chat(messages, opts);
        await this.recordUsage(opts, provider, result);
        return result;
      } catch (err) {
        const msg = (err as Error).message;
        this.logger.warn(`LLM ${name} failed (${msg}). Falling back.`);
        errors.push(`${name}: ${msg}`);
        continue;
      }
    }

    throw new Error(`All LLM providers failed for intent=${intent}: ${errors.join('; ')}`);
  }

  /**
   * Routing per spec section 10:
   * - fast: short replies, classifications → Groq → Gemini → mock
   * - long: long contexts, summaries → Gemini → Anthropic → mock
   * - quality: sensitive cases, angry customers → Anthropic → Gemini → mock
   */
  private routingOrder(intent: 'fast' | 'long' | 'quality'): string[] {
    if (intent === 'fast') return ['groq', 'gemini', 'anthropic', 'mock'];
    if (intent === 'long') return ['gemini', 'anthropic', 'groq', 'mock'];
    return ['anthropic', 'gemini', 'groq', 'mock'];
  }

  private async recordUsage(opts: LlmRouteOptions, provider: LlmProvider, result: LlmChatResult) {
    const cost = provider.estimateCost(result.usage, result.model);
    await this.usage.record({
      tenantId: opts.tenantId,
      officeId: opts.officeId ?? null,
      agentId: opts.agentId ?? null,
      conversationId: opts.conversationId ?? null,
      type: UsageEventType.llm_tokens,
      provider: provider.name,
      quantity: result.usage.inputTokens + result.usage.outputTokens,
      costEstimate: cost,
      metadata: {
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        latencyMs: result.latencyMs,
      },
    });
  }
}
