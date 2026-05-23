import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SignDocumentStatus } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { SignDocumentsService } from '../documents/documents.service';
import { SignStorageService } from '../storage/storage.service';
import { SignPdfService } from '../pdf/pdf.service';
import { SubmitSignatureDto, VerifyOtpDto } from './dto';

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;

interface ReqContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Public-facing signer flow. Resolves the signature_request via the SHA-256
 * hash of the URL token; the raw token is never persisted. Audit events
 * are written by hand because each action (preview, OTP, sign) is its own
 * micro-transaction with its own metadata.
 */
@Injectable()
export class SignPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly storage: SignStorageService,
    private readonly pdf: SignPdfService,
    private readonly documents: SignDocumentsService,
  ) {}

  async preview(token: string, ctx: ReqContext) {
    const req = await this.requireValidRequest(token);
    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'signer',
      action: 'sign.link.opened',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    if (req.status === SignDocumentStatus.sent) {
      await this.prisma.unscoped().signSignatureRequest.update({
        where: { id: req.id },
        data: { status: SignDocumentStatus.viewed },
      });
      await this.prisma.unscoped().signDocument.update({
        where: { id: req.documentId },
        data: { status: SignDocumentStatus.viewed },
      });
    }
    return {
      signerName: req.signerName,
      signerEmailMasked: maskEmail(req.signerEmail),
      documentName: req.document.originalFileName,
      organizationName: req.document.tenant.name,
      otpVerified: !!req.otpVerifiedAt,
      status: req.status,
    };
  }

  async sendOtp(token: string, ctx: ReqContext) {
    const req = await this.requireValidRequest(token);
    if (req.status === SignDocumentStatus.signed) {
      throw new BadRequestException('Already signed');
    }
    if (
      req.otpExpiresAt &&
      req.otpExpiresAt.getTime() - Date.now() > (OTP_TTL_MIN - 1) * 60 * 1000
    ) {
      throw new BadRequestException('OTP already sent recently — try again in a minute');
    }
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.unscoped().signSignatureRequest.update({
      where: { id: req.id },
      data: {
        otpHash: sha256(otp),
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
        otpAttempts: 0,
      },
    });
    await this.email.send({
      to: req.signerEmail,
      subject: `קוד אימות: ${otp}`,
      category: 'otp',
      text: `שלום ${req.signerName},\n\nקוד האימות שלך הוא: ${otp}\n\nתקף ל-10 דקות. אל תשתף עם איש.`,
    });
    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'system',
      action: 'sign.otp.sent',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  }

  async verifyOtp(token: string, dto: VerifyOtpDto, ctx: ReqContext) {
    const req = await this.requireValidRequest(token);
    if (!req.otpHash || !req.otpExpiresAt) {
      throw new BadRequestException('No OTP issued — request one first');
    }
    if (req.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired — request a new one');
    }
    if (req.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException('Too many OTP attempts — request a new code');
    }
    if (req.otpHash !== sha256(dto.otp)) {
      await this.prisma.unscoped().signSignatureRequest.update({
        where: { id: req.id },
        data: { otpAttempts: { increment: 1 } },
      });
      await this.documents.recordAudit({
        tenantId: req.document.tenantId,
        actorType: 'signer',
        action: 'sign.otp.failed',
        targetType: 'sign_request',
        targetId: req.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { attempt: req.otpAttempts + 1 },
      });
      throw new BadRequestException('Wrong OTP');
    }
    await this.prisma.unscoped().signSignatureRequest.update({
      where: { id: req.id },
      data: {
        otpVerifiedAt: new Date(),
        status: SignDocumentStatus.otp_verified,
      },
    });
    await this.prisma.unscoped().signDocument.update({
      where: { id: req.documentId },
      data: { status: SignDocumentStatus.otp_verified },
    });
    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'signer',
      action: 'sign.otp.verified',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  }

  async getDocument(token: string, ctx: ReqContext) {
    const req = await this.requireValidRequest(token);
    if (!req.otpVerifiedAt) throw new ForbiddenException('Verify OTP first');
    const buffer = await this.storage.read(req.document.originalFilePath);
    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'signer',
      action: 'sign.document.viewed',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { buffer, fileName: req.document.originalFileName };
  }

  async submitSignature(token: string, dto: SubmitSignatureDto, ctx: ReqContext) {
    if (!dto.consent) throw new BadRequestException('Consent required');
    const req = await this.requireValidRequest(token);
    if (!req.otpVerifiedAt) throw new ForbiddenException('OTP not verified');
    if (req.status === SignDocumentStatus.signed) {
      throw new BadRequestException('Already signed');
    }

    const m = dto.signatureImage.match(/^data:image\/png;base64,(.+)$/);
    if (!m) throw new BadRequestException('Signature must be a PNG data URI');
    const sigBuffer = Buffer.from(m[1], 'base64');
    const sigPath = await this.storage.save(sigBuffer, 'signatures', `${req.id}.png`);

    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'signer',
      action: 'sign.signature.drawn',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'signer',
      action: 'sign.consent.checked',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const pdfBytes = await this.storage.read(req.document.originalFilePath);
    const events = await this.prisma.unscoped().auditLog.findMany({
      where: {
        OR: [
          { targetType: 'sign_document', targetId: req.documentId },
          { targetType: 'sign_request', targetId: req.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    const signedAt = new Date();
    const { signedPdfBytes, signedPdfHash } = await this.pdf.embedSignatureAndAudit({
      pdfBytes,
      signaturePng: sigBuffer,
      signer: {
        name: req.signerName,
        email: req.signerEmail,
        phone: req.signerPhone,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        signedAt,
      },
      originalHash: req.document.documentHash,
      events: events.map((e) => ({
        timestamp: e.createdAt,
        eventType: e.action,
        description: e.action,
        ipAddress: (e.metadata as { ipAddress?: string } | null)?.ipAddress ?? null,
        userAgent: (e.metadata as { userAgent?: string } | null)?.userAgent ?? null,
      })),
    });
    const signedPath = await this.storage.save(
      signedPdfBytes,
      'signed',
      `signed_${req.document.originalFileName}`,
    );

    const [, , signature] = await this.prisma.unscoped().$transaction([
      this.prisma.unscoped().signDocument.update({
        where: { id: req.documentId },
        data: {
          signedFilePath: signedPath,
          signedDocumentHash: signedPdfHash,
          status: SignDocumentStatus.signed,
        },
      }),
      this.prisma.unscoped().signSignatureRequest.update({
        where: { id: req.id },
        data: { signedAt, status: SignDocumentStatus.signed },
      }),
      this.prisma.unscoped().signSignature.create({
        data: {
          documentId: req.documentId,
          signatureRequestId: req.id,
          signatureImagePath: sigPath,
          signerName: req.signerName,
          signerEmail: req.signerEmail,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          signedAt,
        },
      }),
    ]);

    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'signer',
      action: 'sign.document.signed',
      targetType: 'sign_document',
      targetId: req.documentId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { signedDocumentHash: signedPdfHash },
    });
    await this.documents.recordAudit({
      tenantId: req.document.tenantId,
      actorType: 'system',
      action: 'sign.pdf.generated',
      targetType: 'sign_document',
      targetId: req.documentId,
      metadata: { path: signedPath, hash: signedPdfHash },
    });

    return { ok: true, signedAt, signedDocumentHash: signedPdfHash, signatureId: signature.id };
  }

  private async requireValidRequest(token: string) {
    const req = await this.prisma.unscoped().signSignatureRequest.findUnique({
      where: { signingTokenHash: sha256(token) },
      include: { document: { include: { tenant: true } } },
    });
    if (!req) throw new NotFoundException('Invalid link');
    if (req.tokenExpiresAt < new Date()) throw new ForbiddenException('Link expired');
    if (req.status === SignDocumentStatus.cancelled) {
      throw new ForbiddenException('Link cancelled by sender');
    }
    return req;
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain || user.length < 2) return email;
  return `${user.slice(0, 1)}***${user.slice(-1)}@${domain}`;
}
