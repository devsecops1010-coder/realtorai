// Compact tool descriptions injected into the system prompt so the LLM
// knows what JSON to emit. Keep these concise to save tokens.

export const TOOL_SPECS = [
  {
    name: 'update_lead_status',
    description:
      'Update the lead status. Use when the customer expresses intent or commitment.',
    args: 'status: new|contacted|qualified|hot|meeting_scheduled|not_relevant|no_answer; temperature?: cold|warm|hot',
  },
  {
    name: 'update_lead_fields',
    description: 'Save extracted lead details (city, area, budget, rooms, intent).',
    args: 'fullName?: string; intent?: buy|sell|rent|list_for_rent; city?: string; area?: string; budgetMin?: number; budgetMax?: number; rooms?: number',
  },
  {
    name: 'add_conversation_summary',
    description: 'Write a 1-3 sentence summary of the conversation so far.',
    args: 'summary: string (he/en, 1-3 sentences)',
  },
  {
    name: 'schedule_followup',
    description: 'Set a future follow-up date for the lead.',
    args: 'atIso: ISO-8601 timestamp in the future; reason?: string',
  },
  {
    name: 'create_task_for_realtor',
    description: 'Open an actionable task for a human realtor.',
    args: 'title: string; description?: string; type?: followup|call_lead|visit|send_property|custom; dueAtIso?: string',
  },
  {
    name: 'add_opt_out',
    description: 'Record the lead opted out of future contact.',
    args: 'channel?: whatsapp|call|sms|email (default whatsapp); reason?: string',
  },
  {
    name: 'handoff_to_human',
    description:
      'Mark conversation for human follow-up. Required when: customer asks for a human, complaint, legal/financial guarantees needed, anger.',
    args: 'reason: string; createTask?: boolean (default true)',
  },
] as const;

export type ToolName = (typeof TOOL_SPECS)[number]['name'];

export function renderToolsForPrompt(): string {
  return TOOL_SPECS.map(
    (t) => `- ${t.name}(${t.args}) — ${t.description}`,
  ).join('\n');
}
