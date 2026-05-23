import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentStatus,
  AgentType,
  Prisma,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
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
}
