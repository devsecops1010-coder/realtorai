import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentStatus,
  AgentType,
  LeadIntent,
  LeadStatus,
  LeadTemperature,
  Prisma,
  PropertyDealType,
  PropertyStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { OnboardOfficeDto } from './dto/onboard-office.dto';
import type { Env } from '../config/env.schema';

const DEFAULT_LEAD_PROMPT_TEMPLATE = `You are a warm, professional inbound-lead responder for the office "{office}".
Reply in Hebrew unless the customer writes in English.
Be brief, ask one focused question per turn, and hand off to a human when the lead shows real intent + budget + area + timeline.`;

const DEFAULT_RECRUITER_PROMPT_TEMPLATE = `You are a respectful property-recruiter for the office "{office}".
Talk to property owners about possible sale or rental. Never promise a price or buyer.
Hand off to a human when the owner is genuinely interested.`;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onboard(dto: OnboardOfficeDto) {
    const emailLc = dto.email.toLowerCase().trim();
    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    try {
      return await this.prisma.unscoped().$transaction(async (tx) => {
        const trialDays = Number(process.env.TRIAL_LENGTH_DAYS ?? '14');
        const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        const tenant = await tx.tenant.create({
          data: {
            name: dto.tenantName.trim(),
            status: TenantStatus.trial,
            plan: 'starter',
            trialEndsAt,
          },
        });

        const office = await tx.office.create({
          data: {
            tenantId: tenant.id,
            name: dto.officeName.trim(),
            city: dto.city?.trim() ?? null,
            areas: dto.areas ?? [],
            phone: dto.phone ?? null,
            whatsappNumber: dto.whatsappNumber ?? null,
          },
        });

        const owner = await tx.user.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            name: dto.ownerName.trim(),
            email: emailLc,
            role: UserRole.office_owner,
            status: UserStatus.active,
            passwordHash,
          },
        });

        // Lead responder agent + initial active config
        const leadAgent = await tx.agent.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            type: AgentType.lead_responder,
            name: 'Lead Responder',
            status: AgentStatus.active,
          },
        });
        await tx.agentConfig.create({
          data: {
            tenantId: tenant.id,
            agentId: leadAgent.id,
            prompt:
              dto.leadResponderTone ??
              DEFAULT_LEAD_PROMPT_TEMPLATE.replace('{office}', office.name),
            version: 1,
            isActive: true,
            rules: {
              workingHours: dto.workingHours ?? '08:00-20:00',
            } as Prisma.InputJsonValue,
          },
        });

        // Property recruiter agent + initial active config
        const recruiterAgent = await tx.agent.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            type: AgentType.property_recruiter,
            name: 'Property Recruiter',
            status: AgentStatus.active,
          },
        });
        await tx.agentConfig.create({
          data: {
            tenantId: tenant.id,
            agentId: recruiterAgent.id,
            prompt:
              dto.propertyRecruiterTone ??
              DEFAULT_RECRUITER_PROMPT_TEMPLATE.replace('{office}', office.name),
            version: 1,
            isActive: true,
            rules: {
              workingHours: dto.workingHours ?? '08:00-20:00',
            } as Prisma.InputJsonValue,
          },
        });

        return { tenant, office, owner, agents: [leadAgent, recruiterAgent] };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  /**
   * Seed demo data for the *current* tenant — pulled from RequestContext.
   * Intended for first-run users: 5 leads at varying funnel stages, 3
   * properties, 1 mortgage profile. Each entity gets a "demo" source tag
   * so power users can later filter / bulk-delete them.
   */
  async seedSampleData() {
    const tenantId = RequestContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant in context');

    // Find an office to attach data to. Most tenants only have one; if
    // there are multiple, picking the first is fine — the user can move
    // demo rows later via Kanban / bulk-assign.
    const office = await this.prisma.scoped.office.findFirst({ select: { id: true } });
    if (!office) throw new BadRequestException('No office in tenant — finish onboarding first');

    const NOW = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Realistic-feeling Hebrew demo data — close enough to look like a
    // real pipeline without being recognizable as anyone's actual leads.
    const leadsSeed: Array<{
      fullName: string;
      phone: string;
      city: string;
      area: string;
      intent: LeadIntent;
      status: LeadStatus;
      temperature: LeadTemperature;
      budgetMin: number;
      budgetMax: number;
      rooms: number;
      notes: string;
      createdAt: Date;
    }> = [
      {
        fullName: 'דנה לוי',
        phone: '0501234567',
        city: 'תל אביב',
        area: 'צפון ישן',
        intent: LeadIntent.buy,
        status: LeadStatus.hot,
        temperature: LeadTemperature.hot,
        budgetMin: 2_400_000,
        budgetMax: 3_200_000,
        rooms: 3,
        notes: 'מחפשת דירת 3 חדרים בצפון תל אביב, מוכנה להציע בקרוב.',
        createdAt: new Date(NOW - 2 * day),
      },
      {
        fullName: 'יוסי כהן',
        phone: '0529876543',
        city: 'רמת גן',
        area: 'בורסה',
        intent: LeadIntent.buy,
        status: LeadStatus.qualified,
        temperature: LeadTemperature.warm,
        budgetMin: 1_800_000,
        budgetMax: 2_300_000,
        rooms: 4,
        notes: 'משפחה צעירה, צריכים לסגור מימון לפני קידום.',
        createdAt: new Date(NOW - 5 * day),
      },
      {
        fullName: 'מיכל ברק',
        phone: '0541112233',
        city: 'הרצליה',
        area: 'הרצליה ב',
        intent: LeadIntent.rent,
        status: LeadStatus.contacted,
        temperature: LeadTemperature.warm,
        budgetMin: 8_500,
        budgetMax: 11_000,
        rooms: 3,
        notes: 'דחיפות גבוהה — צריכה להיכנס תוך חודש.',
        createdAt: new Date(NOW - 1 * day),
      },
      {
        fullName: 'אבי דוד',
        phone: '0535554477',
        city: 'תל אביב',
        area: 'פלורנטין',
        intent: LeadIntent.sell,
        status: LeadStatus.new,
        temperature: LeadTemperature.cold,
        budgetMin: 0,
        budgetMax: 0,
        rooms: 2,
        notes: 'בעל דירה בודק אופציות. עוד לא החליט.',
        createdAt: new Date(NOW - 0.5 * day),
      },
      {
        fullName: 'אורית פרי',
        phone: '0507778899',
        city: 'גבעתיים',
        area: 'מרכז',
        intent: LeadIntent.buy,
        status: LeadStatus.meeting_scheduled,
        temperature: LeadTemperature.hot,
        budgetMin: 2_700_000,
        budgetMax: 3_000_000,
        rooms: 4,
        notes: 'פגישת תיווך נקבעה ליום שני. אישרה.',
        createdAt: new Date(NOW - 3 * day),
      },
    ];

    const leadResults = [] as { id: string; fullName: string }[];
    for (const seed of leadsSeed) {
      // tenantId is auto-injected by the tenant extension at runtime, but
      // Prisma's type system insists we provide it. Pass explicitly to
      // satisfy the compiler — it's a no-op duplicate at runtime.
      const lead = await this.prisma.scoped.lead.create({
        data: {
          tenantId,
          officeId: office.id,
          source: 'demo',
          fullName: seed.fullName,
          phone: seed.phone,
          intent: seed.intent,
          status: seed.status,
          temperature: seed.temperature,
          city: seed.city,
          area: seed.area,
          budgetMin: seed.budgetMin || null,
          budgetMax: seed.budgetMax || null,
          rooms: seed.rooms,
          notes: seed.notes,
        } as Prisma.LeadUncheckedCreateInput,
      });
      // Backdate via update — Prisma's create ignores `createdAt` when
      // @default(now()) is set, so we override right after.
      await this.prisma.unscoped().lead.update({
        where: { id: lead.id },
        data: { createdAt: seed.createdAt },
      });
      leadResults.push({ id: lead.id, fullName: lead.fullName ?? '' });
    }

    // 3 sample properties — mix of sale + rent, mix of statuses.
    const propsSeed = [
      {
        dealType: PropertyDealType.sale,
        city: 'תל אביב',
        area: 'צפון ישן',
        street: 'אבן גבירול 80',
        rooms: 3.5,
        floor: 4,
        price: 2_850_000,
        status: PropertyStatus.active,
        notes: 'משופצת, מעלית, חניה.',
      },
      {
        dealType: PropertyDealType.sale,
        city: 'רמת גן',
        area: 'בורסה',
        street: 'ביאליק 22',
        rooms: 4,
        floor: 6,
        price: 2_100_000,
        status: PropertyStatus.active,
        notes: 'נוף לעיר, חניה כפולה.',
      },
      {
        dealType: PropertyDealType.rent,
        city: 'הרצליה',
        area: 'הרצליה ב',
        street: 'סוקולוב 12',
        rooms: 3,
        floor: 2,
        price: 9_500,
        status: PropertyStatus.active,
        notes: 'מרוהטת, כניסה מיידית.',
      },
    ];

    for (const p of propsSeed) {
      await this.prisma.scoped.property.create({
        data: {
          tenantId,
          officeId: office.id,
          ...p,
        } as Prisma.PropertyUncheckedCreateInput,
      });
    }

    // 1 mortgage profile attached to the most "qualified" lead. Field
    // names follow the actual schema (estimatedPrice/estimatedEquity, not
    // monthlyHouseholdIncomeIls etc).
    const target = leadResults.find((l) => l.fullName === 'יוסי כהן');
    if (target) {
      await this.prisma.scoped.mortgageProfile
        .create({
          data: {
            tenantId,
            leadId: target.id,
            estimatedPrice: 2_100_000,
            estimatedEquity: 700_000,
            monthlyIncome: 22_000,
            hasPreApproval: false,
          } as Prisma.MortgageProfileUncheckedCreateInput,
        })
        .catch(() => undefined); // tolerant — already-exists is fine
    }

    return {
      ok: true,
      created: {
        leads: leadResults.length,
        properties: propsSeed.length,
        mortgageProfiles: target ? 1 : 0,
      },
    };
  }
}
