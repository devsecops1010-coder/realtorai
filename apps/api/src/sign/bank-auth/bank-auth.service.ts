import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SignDocumentStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SignDocumentsService } from '../documents/documents.service';
import { SignStorageService } from '../storage/storage.service';
import { BankAuthPdfService } from './bank-auth-pdf.service';
import type {
  AcroFormMap,
  BankAuthTemplateOverlay,
  BankAuthValues,
  BankAuthFieldKey,
} from './types';

@Injectable()
export class BankAuthService {
  private readonly logger = new Logger(BankAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: BankAuthPdfService,
    private readonly storage: SignStorageService,
    private readonly documents: SignDocumentsService,
  ) {}

  /** Lists templates for the bank picker. Catalog is global (no tenantId). */
  list() {
    return this.prisma.unscoped().bankAuthTemplate.findMany({
      where: { active: true },
      orderBy: { bankNameHe: 'asc' },
      select: {
        id: true,
        bankSlug: true,
        bankNameHe: true,
        bankNameEn: true,
        notes: true,
      },
    });
  }

  /**
   * Resolves the values that should go into the template by walking the
   * lead → mortgage profile → advisor chain. Anything missing comes back
   * `undefined` so the UI can prompt the user to fill it in.
   */
  async resolveValuesForLead(args: {
    tenantId: string;
    leadId: string;
    advisorId?: string;
  }): Promise<{ values: BankAuthValues; missing: BankAuthFieldKey[] }> {
    const lead = await this.prisma.unscoped().lead.findFirst({
      where: { id: args.leadId, tenantId: args.tenantId },
      include: {
        mortgageProfile: true,
      },
    });
    if (!lead) throw new NotFoundException('Lead not found in this tenant');

    let advisorId = args.advisorId ?? null;
    // Default to the most recent advisor on the lead's mortgage referrals.
    if (!advisorId && lead.mortgageProfile) {
      const ref = await this.prisma.unscoped().mortgageReferral.findFirst({
        where: { mortgageProfileId: lead.mortgageProfile.id, status: { not: 'closed_lost' } },
        orderBy: { referredAt: 'desc' },
        select: { advisorId: true },
      });
      advisorId = ref?.advisorId ?? null;
    }
    const advisor = advisorId
      ? await this.prisma.unscoped().mortgageAdvisor.findFirst({
          where: { id: advisorId, tenantId: args.tenantId },
        })
      : null;

    const values: BankAuthValues = {
      borrower1_name: lead.fullName ?? undefined,
      borrower1_id: lead.nationalId ?? undefined,
      borrower1_phone: lead.phone ?? undefined,
      borrower1_email: lead.email ?? undefined,
      borrower1_address: this.composeAddress(lead),
      // borrower2 — only if the mortgage profile has a co-applicant
      borrower2_name: lead.mortgageProfile?.coApplicantName ?? undefined,
      borrower2_id: lead.mortgageProfile?.coApplicantNationalId ?? undefined,
      borrower2_phone: lead.mortgageProfile?.coApplicantPhone ?? undefined,
      // Advisor
      advisor_name: advisor?.fullName,
      advisor_id: advisor?.nationalId ?? undefined,
      advisor_phone: advisor?.phone ?? undefined,
      advisor_company_name: advisor?.consultingCompany ?? undefined,
      advisor_company_id: advisor?.consultingCompanyId ?? undefined,
      advisor_license_number: advisor?.licenseNumber ?? undefined,
      // Date — defaults to today; the user can override via the dialog.
      date: new Date().toLocaleDateString('he-IL'),
    };

    const requiredKeys: BankAuthFieldKey[] = [
      'borrower1_name',
      'borrower1_id',
      'borrower1_phone',
      'advisor_name',
      'advisor_id',
    ];
    const missing = requiredKeys.filter(
      (k) => values[k] === undefined || values[k] === null || values[k] === '',
    );

    return { values, missing };
  }

  /** Stitches city + area + street into the form's "address" line. */
  private composeAddress(lead: {
    streetAddress: string | null;
    city: string | null;
    area: string | null;
  }): string | undefined {
    const parts = [lead.streetAddress, lead.area, lead.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /** Renders the filled PDF and returns the bytes (no DB write). */
  async preview(args: {
    tenantId: string;
    bankSlug: string;
    values: BankAuthValues;
  }): Promise<{ buffer: Buffer; fileName: string }> {
    const template = await this.requireTemplate(args.bankSlug);
    const overlay = (template.overlay as unknown as BankAuthTemplateOverlay) ?? { placements: [] };
    const acroFormMap = (template.acroFormMap as unknown as AcroFormMap) ?? {};

    const buffer = await this.pdf.render({
      templatePdfRelPath: template.pdfPath,
      overlay,
      acroFormMap,
      values: args.values,
    });

    const fileName = `כתב הסמכה - ${template.bankNameHe}.pdf`;
    return { buffer, fileName };
  }

  /**
   * Generates the PDF and persists it as a SignDocument (status=draft) linked
   * to the lead. Caller can then create a SignatureRequest in a second step.
   */
  async createDocument(args: {
    user: { id: string; tenantId: string };
    bankSlug: string;
    leadId: string;
    values: BankAuthValues;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const lead = await this.prisma.unscoped().lead.findFirst({
      where: { id: args.leadId, tenantId: args.user.tenantId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Lead not found in this tenant');

    const { buffer, fileName } = await this.preview({
      tenantId: args.user.tenantId,
      bankSlug: args.bankSlug,
      values: args.values,
    });

    const hash = createHash('sha256').update(buffer).digest('hex');
    const path = await this.storage.save(buffer, 'documents', fileName);

    const doc = await this.prisma.unscoped().signDocument.create({
      data: {
        tenantId: args.user.tenantId,
        uploadedByUserId: args.user.id,
        leadId: args.leadId,
        originalFileName: fileName,
        originalFilePath: path,
        documentHash: hash,
        status: SignDocumentStatus.draft,
      },
    });

    await this.documents.recordAudit({
      tenantId: doc.tenantId,
      actorType: 'user',
      actorId: args.user.id,
      action: 'sign.document.generated_from_bank_template',
      targetType: 'sign_document',
      targetId: doc.id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: {
        bankSlug: args.bankSlug,
        fileName,
        sizeBytes: buffer.length,
        sha256: hash,
        leadId: args.leadId,
        filledKeys: Object.keys(args.values).filter((k) => args.values[k as keyof BankAuthValues]),
      },
    });

    return doc;
  }

  private async requireTemplate(slug: string) {
    const t = await this.prisma.unscoped().bankAuthTemplate.findUnique({
      where: { bankSlug: slug },
    });
    if (!t || !t.active) {
      throw new NotFoundException(`Bank template '${slug}' not active`);
    }
    return t;
  }
}
