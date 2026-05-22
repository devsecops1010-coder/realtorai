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
      'Mark conversation for human follow-up. Required when: customer asks for a human, complaint, legal/financial guarantees needed, anger, or property recruiter has real intent + basics.',
    args: 'reason: string; createTask?: boolean (default true)',
  },
  {
    name: 'create_property',
    description:
      'Create a Property record linked to the current (owner) lead. Use when a property recruiter first learns concrete property details.',
    args: 'dealType: sale|rent; city?: string; area?: string; street?: string; rooms?: number; floor?: number; price?: number; condition?: new|excellent|good|needs_renovation|for_demolition; notes?: string',
  },
  {
    name: 'update_property_fields',
    description:
      'Update an existing Property record for the current lead. Use when the recruiter learns more details over time.',
    args: 'propertyId: uuid; city?: string; area?: string; street?: string; rooms?: number; floor?: number; price?: number; condition?: enum; notes?: string',
  },
  {
    name: 'collect_mortgage_info',
    description:
      'Save mortgage-related info extracted in conversation with a buy-intent lead. Use whenever a new fact is learned. NEVER ask for documents or sensitive IDs.',
    args: 'estimatedPrice?: number; estimatedEquity?: number; monthlyIncome?: number; hasPreApproval?: boolean; preApprovalAmount?: number; preApprovalBank?: string',
  },
  {
    name: 'record_mortgage_consent',
    description:
      'Record explicit consent to share the client info with a mortgage advisor. consentText must contain the exact wording the customer agreed to. Required before refer_to_mortgage_advisor.',
    args: 'consent: boolean; consentText: string (the wording the customer agreed to)',
  },
  {
    name: 'refer_to_mortgage_advisor',
    description:
      'Create a referral from the current lead to a mortgage advisor. Will fail if consent was not recorded first.',
    args: 'advisorId: uuid; notes?: string',
  },
  {
    name: 'mark_mortgage_not_relevant',
    description:
      'Mark that the customer does not need a mortgage (cash buyer or chose not to share). Sets MortgageProfile.status=not_relevant.',
    args: 'reason?: string',
  },
] as const;

export type ToolName = (typeof TOOL_SPECS)[number]['name'];

export function renderToolsForPrompt(): string {
  return TOOL_SPECS.map(
    (t) => `- ${t.name}(${t.args}) — ${t.description}`,
  ).join('\n');
}
