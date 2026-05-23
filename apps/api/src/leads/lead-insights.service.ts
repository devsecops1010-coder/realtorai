import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmRouterService } from '../llm/llm-router.service';
import { RequestContext } from '../common/context/request-context';

/**
 * AI-powered insights for a single lead: a short Hebrew summary + a concrete
 * "next-best-action" recommendation grounded in the lead's recent activity.
 *
 * Why a dedicated service rather than embedding in LeadsService:
 *   - Different cache + invalidation semantics (we may persist insights in
 *     Lead.metadata once they prove valuable).
 *   - Pulls together data from messages/tasks/conversations — having it in
 *     LeadsService would balloon that file into a god-class.
 *   - The prompt is product-tunable; isolating it keeps PR diffs readable
 *     when marketing/product wants to tweak the wording.
 *
 * Output contract: always JSON with `summary` (string), `nextAction` (string),
 * `urgency` (low|medium|high). We parse strictly and fall back to a generic
 * structure if the model misbehaves so the UI never crashes.
 */
@Injectable()
export class LeadInsightsService {
  private readonly logger = new Logger(LeadInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouterService,
  ) {}

  async generate(leadId: string): Promise<{
    summary: string;
    nextAction: string;
    urgency: 'low' | 'medium' | 'high';
    model: string;
    generatedAt: string;
  }> {
    // The include shape is reused for the GetPayload type below so the
    // returned object is fully typed even though `prisma.scoped` exposes the
    // bare PrismaClient (the proxy hides the extension types).
    const include = {
      assignedUser: { select: { name: true } },
      conversations: {
        orderBy: { startedAt: 'desc' as const },
        take: 3,
        select: {
          channel: true,
          status: true,
          summary: true,
          startedAt: true,
          messages: {
            orderBy: { createdAt: 'desc' as const },
            // 6 = last ~3 message exchanges (lead + reply). Enough context
            // without making the prompt unwieldy.
            take: 6,
            select: { senderType: true, body: true, createdAt: true },
          },
        },
      },
      tasks: {
        where: { status: { in: ['open', 'in_progress', 'snoozed'] } } as Prisma.TaskWhereInput,
        orderBy: { dueAt: 'asc' as const },
        take: 5,
        select: { title: true, status: true, dueAt: true, type: true },
      },
    } satisfies Prisma.LeadInclude;

    type LeadWithIncludes = Prisma.LeadGetPayload<{ include: typeof include }>;
    const lead = (await this.prisma.scoped.lead.findFirst({
      where: { id: leadId },
      include,
    })) as LeadWithIncludes | null;

    if (!lead) throw new NotFoundException('Lead not found');

    // Tenant context drives provider routing + cost tracking. The scoped
    // findFirst above means we trust the request context to be set — if
    // somehow it isn't, fall back to the lead's own tenantId so we still
    // record usage correctly rather than crashing.
    const tenantId = RequestContext.getTenantId() ?? lead.tenantId;

    // Build the conversation excerpt newest-first → oldest, so the model
    // reads it chronologically (we reverse here).
    const conversationLines: string[] = [];
    for (const c of lead.conversations) {
      const msgs = [...c.messages].reverse();
      for (const m of msgs) {
        const speaker = m.senderType === 'lead' ? 'ליד' : m.senderType === 'user' ? 'מתווך' : 'מערכת';
        conversationLines.push(`${speaker}: ${m.body.slice(0, 200)}`);
      }
    }

    const taskLines = lead.tasks
      .map((t) => `- ${t.title} (${t.type}${t.dueAt ? `, due ${t.dueAt.toISOString().slice(0, 10)}` : ''})`)
      .join('\n');

    const system = `אתה אנליסט CRM מומחה לתחום הנדל"ן בישראל. אתה מנתח לידים ומציע פעולה הבאה קונקרטית למתווך.
אתה משיב אך ורק ב-JSON תקף עם הסכמה:
{ "summary": string (1-2 משפטים בעברית, תיאור מצב הליד),
  "nextAction": string (משפט אחד בעברית, פעולה ספציפית למתווך — לא כללית),
  "urgency": "low" | "medium" | "high" }
אל תוסיף שדות נוספים. אל תוסיף הסברים מחוץ ל-JSON.`;

    const user = `נתוני הליד:
- שם: ${lead.fullName ?? 'לא ידוע'}
- טלפון: ${lead.phone ?? 'אין'}
- כוונה: ${lead.intent}
- סטטוס נוכחי: ${lead.status}
- טמפרטורה: ${lead.temperature}
- אזור: ${lead.area ?? lead.city ?? 'לא ידוע'}
- תקציב: ${lead.budgetMin ?? '?'}–${lead.budgetMax ?? '?'} ₪
- חדרים: ${lead.rooms ?? 'לא ידוע'}
- מתווך מטפל: ${lead.assignedUser?.name ?? 'לא הוקצה'}
- הערות: ${lead.notes?.slice(0, 300) ?? 'אין'}

${conversationLines.length > 0 ? `שיחות אחרונות:\n${conversationLines.join('\n')}` : 'אין שיחות עדיין.'}

${taskLines ? `משימות פתוחות:\n${taskLines}` : 'אין משימות פתוחות.'}

החזר תובנות ב-JSON בלבד.`;

    const result = await this.llm.chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      {
        tenantId,
        officeId: lead.officeId,
        intent: 'fast',
        // JSON mode where supported — the providers that don't grok this
        // ignore it and we still parse below.
        responseFormat: 'json',
        temperature: 0.3,
        maxTokens: 400,
      },
    );

    // Tolerant parsing — strip code fences if the model wrapped its output.
    const parsed = this.parseInsights(result.content);
    return {
      ...parsed,
      model: result.model,
      generatedAt: new Date().toISOString(),
    };
  }

  private parseInsights(raw: string): {
    summary: string;
    nextAction: string;
    urgency: 'low' | 'medium' | 'high';
  } {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    try {
      const obj = JSON.parse(cleaned);
      const urgency = ['low', 'medium', 'high'].includes(obj.urgency) ? obj.urgency : 'medium';
      return {
        summary: typeof obj.summary === 'string' ? obj.summary : 'אין מידע מספיק להפקת תקציר.',
        nextAction:
          typeof obj.nextAction === 'string'
            ? obj.nextAction
            : 'בצע שיחת היכרות ראשונה תוך 24 שעות.',
        urgency,
      };
    } catch (err) {
      // The model returned something non-JSON; salvage the text as a summary
      // and provide a generic action so the UI still shows something useful.
      this.logger.warn(`Failed to parse insights JSON: ${(err as Error).message}`);
      return {
        summary: cleaned.slice(0, 200),
        nextAction: 'בצע שיחת מעקב והעלה את הסטטוס של הליד.',
        urgency: 'medium',
      };
    }
  }
}
