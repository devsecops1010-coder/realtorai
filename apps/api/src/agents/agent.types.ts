export interface AgentDecision {
  reply: string;
  actions: { tool: string; args: Record<string, unknown> }[];
}

export function parseAgentResponse(raw: string): AgentDecision {
  // Strip markdown fences if the model added them anyway.
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : '',
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
            .filter((a: unknown) => typeof a === 'object' && a !== null)
            .map((a: { tool?: string; args?: Record<string, unknown> }) => ({
              tool: a.tool ?? '',
              args: a.args ?? {},
            }))
            .filter((a: { tool: string }) => Boolean(a.tool))
        : [],
    };
  } catch {
    // If the model returned plain text by mistake, treat the whole thing as the reply.
    return { reply: cleaned, actions: [] };
  }
}
