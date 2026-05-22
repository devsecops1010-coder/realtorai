export interface ToolContext {
  tenantId: string;
  officeId: string;
  agentId: string;
  conversationId: string | null;
  leadId: string | null;
  /** Sender phone (for OptOut, etc.) */
  fromPhone: string | null;
}

export interface ToolResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

export interface ToolDefinition<Args = unknown> {
  name: string;
  description: string;
  argsSchema?: unknown; // optional zod schema or JSON-schema for prompts
  execute(args: Args, ctx: ToolContext): Promise<ToolResult>;
}
