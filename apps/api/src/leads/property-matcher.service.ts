import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Property matcher. Given a lead, returns the top-N active properties that
 * best fit the lead's stated criteria (budget, rooms, area). No ML — just a
 * deterministic scoring function. We can swap in embeddings later, but the
 * naive scorer is good enough and explainable.
 *
 * Scoring (max 100):
 *   - dealType match → 30 (sale/rent must match intent)
 *   - budget within range → 25, partially within → 12
 *   - rooms within ±0.5 → 20, within ±1 → 10
 *   - area substring match → 15
 *   - city match → 10
 *
 * Properties scoring under 30 are filtered out — irrelevant noise.
 */
@Injectable()
export class PropertyMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async findMatches(leadId: string, limit = 5) {
    const lead = await this.prisma.scoped.lead.findFirst({
      where: { id: leadId },
      select: {
        id: true, intent: true, city: true, area: true, budgetMin: true,
        budgetMax: true, rooms: true,
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Map LeadIntent → PropertyDealType. `buy` → `sale`, `rent` → `rent`,
    // `sell`/`list_for_rent`/`unknown` → no match (those leads are owners,
    // not buyers).
    const wantsDealType =
      lead.intent === 'buy' ? 'sale' : lead.intent === 'rent' ? 'rent' : null;
    if (!wantsDealType) {
      return { matches: [], reason: 'הליד הוא בעל נכס, לא קונה/שוכר — אין נכסים תואמים' };
    }

    // Pull a reasonable pool of active properties and score in-memory. For
    // typical tenants this is hundreds, not millions. If a tenant ever has
    // 100k+ active properties, push the scoring into SQL.
    const candidates = await this.prisma.scoped.property.findMany({
      where: { status: 'active', dealType: wantsDealType },
      select: {
        id: true, dealType: true, city: true, area: true, street: true,
        rooms: true, price: true, floor: true, coverImageUrl: true,
      },
      take: 200,
    });

    const scored = candidates
      .map((p) => {
        let score = 30; // dealType already matched (we filtered)
        const reasons: string[] = ['התאמת סוג עסקה'];

        // Budget — if the lead specified a range, score on overlap.
        if (lead.budgetMin && lead.budgetMax && p.price) {
          if (p.price >= lead.budgetMin && p.price <= lead.budgetMax) {
            score += 25;
            reasons.push('בתוך התקציב');
          } else if (
            p.price >= lead.budgetMin * 0.85 &&
            p.price <= lead.budgetMax * 1.15
          ) {
            score += 12;
            reasons.push('קרוב לתקציב');
          }
        }

        // Rooms — within ±0.5 is "exact", ±1 is "close".
        if (lead.rooms && p.rooms) {
          const diff = Math.abs(p.rooms - lead.rooms);
          if (diff <= 0.5) {
            score += 20;
            reasons.push(`${p.rooms} חדרים (מדויק)`);
          } else if (diff <= 1) {
            score += 10;
            reasons.push(`${p.rooms} חדרים (קרוב)`);
          }
        }

        // Area string match (loose — partial substring either direction).
        if (lead.area && p.area && lead.area.length > 1) {
          if (
            p.area.includes(lead.area) ||
            lead.area.includes(p.area)
          ) {
            score += 15;
            reasons.push(`אזור: ${p.area}`);
          }
        }

        // City match — last resort if area didn't hit.
        if (lead.city && p.city && lead.city === p.city) {
          score += 10;
          reasons.push(`עיר: ${p.city}`);
        }

        return { property: p, score, reasons };
      })
      .filter((s) => s.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      matches: scored,
      reason: scored.length === 0 ? 'אין נכסים פעילים שתואמים לקריטריונים' : undefined,
    };
  }
}
