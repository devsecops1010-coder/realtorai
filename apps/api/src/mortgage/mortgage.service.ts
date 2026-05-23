import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MortgageReadiness,
  MortgageStatus,
  NotificationSeverity,
  NotificationType,
  Prisma,
  ReferralStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConsentDto } from './dto/consent.dto';
import { ReferDto } from './dto/refer.dto';

@Injectable()
export class MortgageService {
  private readonly logger = new Logger(MortgageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- Advisors ----------

  listAdvisors() {
    return this.prisma.scoped.mortgageAdvisor.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { referrals: true } } },
    });
  }

  async getAdvisor(id: string) {
    const a = await this.prisma.scoped.mortgageAdvisor.findFirst({
      where: { id },
      include: {
        referrals: {
          orderBy: { referredAt: 'desc' },
          take: 30,
          include: { profile: { include: { lead: { select: { fullName: true } } } } },
        },
      },
    });
    if (!a) throw new NotFoundException('Advisor not found');
    return a;
  }

  async createAdvisor(dto: CreateAdvisorDto) {
    const data: Omit<Prisma.MortgageAdvisorUncheckedCreateInput, 'tenantId'> = {
      fullName: dto.fullName.trim(),
      nationalId: dto.nationalId?.trim() || null,
      licenseNumber: dto.licenseNumber?.trim() || null,
      consultingCompany: dto.consultingCompany?.trim() || null,
      consultingCompanyId: dto.consultingCompanyId?.trim() || null,
      company: dto.company ?? null,
      phone: dto.phone ?? null,
      email: dto.email?.toLowerCase().trim() ?? null,
      notes: dto.notes ?? null,
      status: dto.status ?? 'active',
    };
    return this.prisma.scoped.mortgageAdvisor.create({
      data: data as Prisma.MortgageAdvisorUncheckedCreateInput,
    });
  }

  async updateAdvisor(id: string, dto: UpdateAdvisorDto) {
    const existing = await this.prisma.scoped.mortgageAdvisor.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Advisor not found');
    const data: Prisma.MortgageAdvisorUncheckedUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.nationalId !== undefined) data.nationalId = dto.nationalId.trim() || null;
    if (dto.licenseNumber !== undefined) data.licenseNumber = dto.licenseNumber.trim() || null;
    if (dto.consultingCompany !== undefined)
      data.consultingCompany = dto.consultingCompany.trim() || null;
    if (dto.consultingCompanyId !== undefined)
      data.consultingCompanyId = dto.consultingCompanyId.trim() || null;
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.scoped.mortgageAdvisor.update({ where: { id }, data });
  }

  // ---------- Profiles ----------

  listProfiles(status?: MortgageStatus) {
    return this.prisma.scoped.mortgageProfile.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: { select: { id: true, fullName: true, phone: true, intent: true, city: true } },
        _count: { select: { referrals: true } },
      },
      take: 200,
    });
  }

  async getProfile(id: string) {
    const p = await this.prisma.scoped.mortgageProfile.findFirst({
      where: { id },
      include: {
        lead: { select: { id: true, fullName: true, phone: true, intent: true, city: true, area: true } },
        referrals: {
          orderBy: { referredAt: 'desc' },
          include: { advisor: { select: { id: true, fullName: true, company: true } } },
        },
      },
    });
    if (!p) throw new NotFoundException('Mortgage profile not found');
    return p;
  }

  async getOrCreateProfileForLead(leadId: string) {
    const lead = await this.prisma.scoped.lead.findFirst({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const existing = await this.prisma.scoped.mortgageProfile.findFirst({ where: { leadId } });
    if (existing) return existing;
    const data: Omit<Prisma.MortgageProfileUncheckedCreateInput, 'tenantId'> = { leadId };
    return this.prisma.scoped.mortgageProfile.create({
      data: data as Prisma.MortgageProfileUncheckedCreateInput,
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.scoped.mortgageProfile.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Mortgage profile not found');

    const data: Prisma.MortgageProfileUncheckedUpdateInput = {};
    if (dto.estimatedPrice !== undefined) data.estimatedPrice = dto.estimatedPrice;
    if (dto.estimatedEquity !== undefined) data.estimatedEquity = dto.estimatedEquity;
    if (dto.hasPreApproval !== undefined) data.hasPreApproval = dto.hasPreApproval;
    if (dto.preApprovalAmount !== undefined) data.preApprovalAmount = dto.preApprovalAmount;
    if (dto.preApprovalBank !== undefined) data.preApprovalBank = dto.preApprovalBank;
    if (dto.monthlyIncome !== undefined) data.monthlyIncome = dto.monthlyIncome;
    if (dto.coApplicantName !== undefined) data.coApplicantName = dto.coApplicantName || null;
    if (dto.coApplicantNationalId !== undefined)
      data.coApplicantNationalId = dto.coApplicantNationalId || null;
    if (dto.coApplicantPhone !== undefined) data.coApplicantPhone = dto.coApplicantPhone || null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const wasPreApproved = existing.hasPreApproval;
    const becomesPreApproved = dto.hasPreApproval === true && !wasPreApproved;

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.readiness !== undefined) data.readiness = dto.readiness;
    if (dto.readinessScore !== undefined) data.readinessScore = dto.readinessScore;

    // Recompute score if any input changed and status/score weren't explicitly set
    const updated = await this.prisma.scoped.mortgageProfile.update({
      where: { id },
      data,
    });
    if (dto.readinessScore === undefined) {
      const recomputed = this.computeReadiness({
        ...updated,
        estimatedPrice: updated.estimatedPrice,
        estimatedEquity: updated.estimatedEquity,
        hasPreApproval: updated.hasPreApproval,
        monthlyIncome: updated.monthlyIncome,
      });
      const finalRow = await this.prisma.scoped.mortgageProfile.update({
        where: { id },
        data: {
          readinessScore: recomputed.score,
          readiness: recomputed.bucket,
        },
      });

      if (becomesPreApproved) {
        await this.notifyPreApproved(finalRow.tenantId, existing.leadId, finalRow.id);
      }
      return finalRow;
    }

    if (becomesPreApproved) {
      await this.notifyPreApproved(updated.tenantId, existing.leadId, updated.id);
    }
    return updated;
  }

  // ---------- Consent ----------

  async recordConsent(profileId: string, dto: ConsentDto) {
    const existing = await this.prisma.scoped.mortgageProfile.findFirst({ where: { id: profileId } });
    if (!existing) throw new NotFoundException('Mortgage profile not found');
    return this.prisma.scoped.mortgageProfile.update({
      where: { id: profileId },
      data: {
        consentToShareWithAdvisor: dto.consentToShareWithAdvisor,
        consentTimestamp: dto.consentToShareWithAdvisor ? new Date() : null,
        consentText: dto.consentText,
      },
    });
  }

  // ---------- Referrals ----------

  async refer(profileId: string, dto: ReferDto) {
    const profile = await this.prisma.scoped.mortgageProfile.findFirst({
      where: { id: profileId },
      include: { lead: true },
    });
    if (!profile) throw new NotFoundException('Mortgage profile not found');
    if (!profile.consentToShareWithAdvisor) {
      throw new ForbiddenException(
        'לקוח לא נתן הסכמה להעברת פרטים ליועץ — חובה לרשום הסכמה לפני referral',
      );
    }
    const advisor = await this.prisma.scoped.mortgageAdvisor.findFirst({ where: { id: dto.advisorId } });
    if (!advisor) throw new NotFoundException('Advisor not found');
    if (advisor.status !== 'active') {
      throw new BadRequestException('Advisor is not active');
    }

    const referral = await this.prisma.scoped.mortgageReferral.create({
      data: {
        mortgageProfileId: profile.id,
        advisorId: advisor.id,
        status: ReferralStatus.pending,
        notes: dto.notes ?? null,
      } as Prisma.MortgageReferralUncheckedCreateInput,
    });

    await this.prisma.scoped.mortgageProfile.update({
      where: { id: profile.id },
      data: { status: MortgageStatus.referred },
    });

    await this.notifyReferred(profile.tenantId, profile.leadId, advisor.fullName, profile.id);

    return referral;
  }

  async updateReferralStatus(id: string, status: ReferralStatus, notes?: string) {
    const existing = await this.prisma.scoped.mortgageReferral.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Referral not found');
    const data: Prisma.MortgageReferralUncheckedUpdateInput = { status };
    if (notes !== undefined) data.notes = notes;
    if (status === ReferralStatus.contacted && !existing.contactedAt) data.contactedAt = new Date();
    const terminal: ReferralStatus[] = [
      ReferralStatus.closed_won,
      ReferralStatus.closed_lost,
      ReferralStatus.declined,
    ];
    if (terminal.includes(status)) {
      data.closedAt = new Date();
    }
    return this.prisma.scoped.mortgageReferral.update({ where: { id }, data });
  }

  listReferrals(status?: ReferralStatus) {
    return this.prisma.scoped.mortgageReferral.findMany({
      where: status ? { status } : undefined,
      orderBy: { referredAt: 'desc' },
      include: {
        profile: { include: { lead: { select: { id: true, fullName: true, phone: true } } } },
        advisor: { select: { id: true, fullName: true, company: true } },
      },
      take: 200,
    });
  }

  // ---------- Readiness scoring ----------

  computeReadiness(p: {
    estimatedPrice: number | null;
    estimatedEquity: number | null;
    hasPreApproval: boolean;
    monthlyIncome: number | null;
  }): { score: number; bucket: MortgageReadiness } {
    let score = 0;
    if (p.hasPreApproval) score += 50;
    if (p.estimatedPrice && p.estimatedPrice > 0) score += 10;
    if (p.monthlyIncome && p.monthlyIncome >= 12000) score += 15;
    if (p.estimatedEquity && p.estimatedPrice && p.estimatedEquity / p.estimatedPrice >= 0.25) {
      score += 20;
    } else if (p.estimatedEquity && p.estimatedPrice) {
      score += 5; // some equity but below 25%
    }
    score = Math.min(100, score);

    let bucket: MortgageReadiness = MortgageReadiness.unknown;
    if (p.hasPreApproval) bucket = MortgageReadiness.approved;
    else if (score >= 60) bucket = MortgageReadiness.ready;
    else if (score >= 30) bucket = MortgageReadiness.partial;
    else if (p.estimatedPrice || p.estimatedEquity || p.monthlyIncome) bucket = MortgageReadiness.not_ready;
    return { score, bucket };
  }

  // ---------- Notifications ----------

  private async notifyReferred(tenantId: string, leadId: string, advisorName: string, profileId: string) {
    await this.notifications.broadcast({
      tenantId,
      type: NotificationType.mortgage_referred,
      severity: NotificationSeverity.info,
      title: '💰 הליד הופנה ליועץ משכנתאות',
      body: `הופנה ל-${advisorName}`,
      link: `/leads/${leadId}`,
      metadata: { leadId, profileId, advisorName },
    });
  }

  private async notifyPreApproved(tenantId: string, leadId: string, profileId: string) {
    await this.notifications.broadcast({
      tenantId,
      type: NotificationType.mortgage_pre_approved,
      severity: NotificationSeverity.alert,
      title: '✅ ליד עם אישור עקרוני',
      body: 'הלקוח קיבל אישור עקרוני למשכנתא — מוכן לפגישה',
      link: `/leads/${leadId}`,
      metadata: { leadId, profileId },
    });
  }
}
