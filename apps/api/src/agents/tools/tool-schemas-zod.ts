import { z } from 'zod';

// Reusable enums kept in sync with @prisma/client — keeping them local
// instead of importing prisma enums so the schemas can be evaluated in
// the editor without ts-prisma reflection.
const LeadStatus = z.enum([
  'new', 'contacted', 'qualified', 'hot',
  'meeting_scheduled', 'not_relevant', 'no_answer',
  'opted_out', 'handoff_to_human',
]);
const LeadTemperature = z.enum(['cold', 'warm', 'hot']);
const LeadIntent = z.enum(['buy', 'sell', 'rent', 'list_for_rent', 'unknown']);
const TaskType = z.enum([
  'followup', 'call_lead', 'visit', 'send_property',
  'mortgage_followup', 'custom',
]);
const OptOutChannel = z.enum(['whatsapp', 'call', 'sms', 'email']);
const PropertyDealType = z.enum(['sale', 'rent']);
const PropertyCondition = z.enum([
  'new', 'excellent', 'good', 'needs_renovation', 'for_demolition',
]);

// Common limits
const Money = z.number().int().min(0).max(1_000_000_000);
const Rooms = z.number().min(0).max(50);
const ShortText = z.string().min(1).max(200);
const MediumText = z.string().min(1).max(2_000);
const LongText = z.string().min(1).max(8_000);

export const ToolSchemas = {
  update_lead_status: z.object({
    status: LeadStatus,
    temperature: LeadTemperature.optional(),
  }),
  update_lead_fields: z.object({
    fullName: ShortText.optional(),
    intent: LeadIntent.optional(),
    city: ShortText.optional(),
    area: ShortText.optional(),
    budgetMin: Money.optional(),
    budgetMax: Money.optional(),
    rooms: Rooms.optional(),
  }),
  add_conversation_summary: z.object({
    summary: MediumText,
  }),
  schedule_followup: z.object({
    atIso: z.string().datetime(),
    reason: z.string().max(500).optional(),
  }),
  create_task_for_realtor: z.object({
    title: ShortText,
    description: MediumText.optional(),
    type: TaskType.optional(),
    dueAtIso: z.string().datetime().optional(),
    assignedUserId: z.string().uuid().optional(),
  }),
  add_opt_out: z.object({
    channel: OptOutChannel.optional(),
    reason: z.string().max(500).optional(),
  }),
  handoff_to_human: z.object({
    reason: MediumText,
    createTask: z.boolean().optional(),
  }),
  create_property: z.object({
    dealType: PropertyDealType,
    city: ShortText.optional(),
    area: ShortText.optional(),
    street: ShortText.optional(),
    rooms: Rooms.optional(),
    floor: z.number().int().min(-5).max(150).optional(),
    price: Money.optional(),
    condition: PropertyCondition.optional(),
    notes: MediumText.optional(),
  }),
  update_property_fields: z.object({
    propertyId: z.string().uuid(),
    city: ShortText.optional(),
    area: ShortText.optional(),
    street: ShortText.optional(),
    rooms: Rooms.optional(),
    floor: z.number().int().min(-5).max(150).optional(),
    price: Money.optional(),
    condition: PropertyCondition.optional(),
    notes: MediumText.optional(),
  }),
  // Mortgage tools — every guardrail in spec section 29:
  // - no document fields here on purpose
  // - consentText must be substantive (the LLM cannot hand a one-word "yes")
  collect_mortgage_info: z.object({
    estimatedPrice: Money.optional(),
    estimatedEquity: Money.optional(),
    monthlyIncome: Money.optional(),
    hasPreApproval: z.boolean().optional(),
    preApprovalAmount: Money.optional(),
    preApprovalBank: z.string().min(2).max(60).optional(),
  }),
  record_mortgage_consent: z.object({
    consent: z.boolean(),
    consentText: z.string().min(10).max(2_000),
  }),
  refer_to_mortgage_advisor: z.object({
    advisorId: z.string().uuid(),
    notes: MediumText.optional(),
  }),
  mark_mortgage_not_relevant: z.object({
    reason: z.string().max(500).optional(),
  }),
} as const;

export type ToolName = keyof typeof ToolSchemas;

export function validateToolArgs(
  name: string,
  args: unknown,
): { ok: true; data: unknown } | { ok: false; error: string } {
  const schema = (ToolSchemas as Record<string, z.ZodTypeAny>)[name];
  if (!schema) return { ok: false, error: `Unknown tool: ${name}` };
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `Invalid args for ${name}: ${msg}` };
  }
  return { ok: true, data: parsed.data };
}
