import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmRouterService } from '../llm/llm-router.service';
import { RequestContext } from '../common/context/request-context';

/**
 * Quick-reply suggestion service. Given a conversation id, returns a
 * single proposed reply the user can edit + send. The user always reviews
 * before sending — we never auto-post.
 *
 * The model gets the last ~10 messages + the lead's basic context. We
 * favor concise replies (<= 200 chars) because most CRM follow-ups are
 * short, and short suggestions are easier for the user to tweak.
 */
@Injectable()
export class QuickReplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouterService,
  ) {}

  async suggest(conversationId: string): Promise<{ suggestion: string; model: string }> {
    const include = {
      lead: {
        select: { id: true, fullName: true, phone: true, intent: true, status: true, city: true, area: true, budgetMin: true, budgetMax: true, rooms: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 10,
        select: { senderType: true, body: true, createdAt: true },
      },
    } satisfies Prisma.ConversationInclude;
    type C = Prisma.ConversationGetPayload<{ include: typeof include }>;

    const conv = (await this.prisma.scoped.conversation.findFirst({
      where: { id: conversationId },
      include,
    })) as C | null;

    if (!conv) throw new NotFoundException('Conversation not found');

    const tenantId = RequestContext.getTenantId() ?? conv.tenantId;

    const transcript = [...conv.messages]
      .reverse()
      .map((m) => {
        const who = m.senderType === 'lead' ? 'ליד' : m.senderType === 'user' ? 'מתווך' : 'AI';
        return `${who}: ${m.body.slice(0, 200)}`;
      })
      .join('\n');

    const lead = conv.lead;
    const leadCtx = lead
      ? `ליד: ${lead.fullName ?? 'ללא שם'} · כוונה ${lead.intent} · ${lead.city ?? ''} ${lead.area ?? ''} · תקציב ${lead.budgetMin ?? '?'}-${lead.budgetMax ?? '?'} · ${lead.rooms ?? '?'} חדרים`
      : 'אין ליד מקושר.';

    const system = `אתה עוזר אישי למתווך נדל"ן. תפקידך: לכתוב למתווך הצעה להודעת המשך אחת, בעברית, קצרה (עד 200 תווים), בנימה חמה ומקצועית, שמתאימה למצב השיחה. אם הליד שאל שאלה — ענה עליה. אם השיחה תקועה — דחוף עדינות לפעולה הבאה (פגישה, ביקור, שיתוף פרטים). אל תוסיף הקדמות ("הנה הצעה:"). תן אך ורק את גוף ההודעה — שורות בודדות בלבד.`;
    const user = `${leadCtx}\n\nשיחה אחרונה:\n${transcript || '(אין הודעות עדיין)'}\n\nכתוב הצעה למתווך למה לכתוב עכשיו.`;

    const result = await this.llm.chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      {
        tenantId,
        officeId: conv.officeId ?? null,
        conversationId: conv.id,
        intent: 'fast',
        temperature: 0.5,
        maxTokens: 200,
      },
    );

    // Strip surrounding quotes if the model wrapped the reply (some
    // models do this when asked for "a reply"). Also collapse multiple
    // blank lines into one.
    const cleaned = result.content
      .trim()
      .replace(/^["׳"]+/, '')
      .replace(/["׳"]+$/, '')
      .replace(/\n{3,}/g, '\n\n');

    return { suggestion: cleaned, model: result.model };
  }
}
