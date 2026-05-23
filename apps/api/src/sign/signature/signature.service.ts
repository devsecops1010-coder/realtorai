import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationSeverity, NotificationType, SignDocumentStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SignDocumentsService } from '../documents/documents.service';
import { CreateSignatureRequestDto } from './dto';

const SIGNING_TOKEN_TTL_DAYS = 7;

@Injectable()
export class SignSignatureService {
  private readonly logger = new Logger(SignSignatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly documents: SignDocumentsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async create(args: {
    user: { id: string; tenantId: string };
    dto: CreateSignatureRequestDto;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const doc = await this.prisma.unscoped().signDocument.findFirst({
      where: { id: args.dto.documentId, tenantId: args.user.tenantId },
      include: {
        signatureRequest: true,
        tenant: { select: { name: true } },
        uploadedBy: { select: { name: true } },
        lead: { select: { id: true, fullName: true, assignedUserId: true, officeId: true } },
        property: { select: { id: true, officeId: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.signatureRequest) throw new ConflictException('Document already has a signature request');
    if (doc.status !== SignDocumentStatus.draft) {
      throw new BadRequestException(`Document is in status ${doc.status}; expected draft`);
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const [request] = await this.prisma.unscoped().$transaction([
      this.prisma.unscoped().signSignatureRequest.create({
        data: {
          documentId: doc.id,
          signerName: args.dto.signerName.trim(),
          signerEmail: args.dto.signerEmail.toLowerCase().trim(),
          signerPhone: args.dto.signerPhone ?? null,
          signingTokenHash: tokenHash,
          tokenExpiresAt: expiresAt,
          status: SignDocumentStatus.sent,
        },
      }),
      this.prisma.unscoped().signDocument.update({
        where: { id: doc.id },
        data: { status: SignDocumentStatus.sent },
      }),
    ]);

    await this.documents.recordAudit({
      tenantId: doc.tenantId,
      actorType: 'user',
      actorId: args.user.id,
      action: 'sign.request.created',
      targetType: 'sign_request',
      targetId: request.id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: { documentId: doc.id, signerEmail: request.signerEmail },
    });

    // Send the email with the signing link.
    const webBase = (this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3001').replace(/\/+$/, '');
    const link = `${webBase}/sign/${rawToken}`;
    try {
      await this.email.send({
        to: request.signerEmail,
        subject: `${doc.tenant.name} שלחו לך מסמך לחתימה`,
        category: 'signing_link',
        text: [
          `שלום ${request.signerName},`,
          ``,
          `${doc.uploadedBy.name} מ-${doc.tenant.name} שלח/ה לך מסמך לחתימה: "${doc.originalFileName}".`,
          ``,
          `לחץ/י על הקישור כדי לפתוח, לאמת זהות ולחתום (תקף 7 ימים):`,
          link,
        ].join('\n'),
      });
      await this.documents.recordAudit({
        tenantId: doc.tenantId,
        actorType: 'system',
        action: 'sign.email.sent',
        targetType: 'sign_request',
        targetId: request.id,
        metadata: { template: 'signing_link', to: request.signerEmail },
      });
    } catch (err) {
      await this.documents.recordAudit({
        tenantId: doc.tenantId,
        actorType: 'system',
        action: 'sign.email.failed',
        targetType: 'sign_request',
        targetId: request.id,
        metadata: { template: 'signing_link', to: request.signerEmail, error: (err as Error).message },
      });
    }

    // CRM notification — surface this request in the office's notifications
    // feed so the team sees it without polling /documents. We target the
    // lead's assigned user when known, otherwise broadcast to the office
    // owner/manager via NotificationsService.broadcast()'s default.
    try {
      const officeId = doc.lead?.officeId ?? doc.property?.officeId ?? null;
      const targetUserId = doc.lead?.assignedUserId ?? null;
      const leadSuffix = doc.lead?.fullName ? ` — ${doc.lead.fullName}` : '';
      await this.notifications.broadcast({
        tenantId: doc.tenantId,
        officeId,
        type: NotificationType.system,
        severity: NotificationSeverity.info,
        title: `נשלח מסמך לחתימה${leadSuffix}`,
        body: `${doc.originalFileName} נשלח ל-${request.signerName} (${request.signerEmail})`,
        link: `/documents/${doc.id}`,
        userIds: targetUserId ? [targetUserId] : undefined,
        metadata: {
          documentId: doc.id,
          signatureRequestId: request.id,
          ...(doc.leadId ? { leadId: doc.leadId } : {}),
          ...(doc.propertyId ? { propertyId: doc.propertyId } : {}),
        },
      });
    } catch (err) {
      // Notification failures shouldn't fail the whole signature request —
      // the email already went out, the audit log already has it.
      this.logger.warn(`Notification broadcast failed: ${(err as Error).message}`);
    }

    return { request, signingToken: rawToken };
  }

  list(tenantId: string) {
    return this.prisma.unscoped().signSignatureRequest.findMany({
      where: { document: { tenantId } },
      orderBy: { createdAt: 'desc' },
      include: { document: { select: { id: true, originalFileName: true, status: true } } },
    });
  }

  async cancel(args: {
    tenantId: string;
    actor: { id: string };
    requestId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const req = await this.prisma.unscoped().signSignatureRequest.findFirst({
      where: { id: args.requestId, document: { tenantId: args.tenantId } },
      include: { document: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status === SignDocumentStatus.signed) {
      throw new BadRequestException('Already signed — cannot cancel');
    }
    await this.prisma.unscoped().$transaction([
      this.prisma.unscoped().signSignatureRequest.update({
        where: { id: req.id },
        data: { status: SignDocumentStatus.cancelled },
      }),
      this.prisma.unscoped().signDocument.update({
        where: { id: req.documentId },
        data: { status: SignDocumentStatus.cancelled },
      }),
    ]);
    await this.documents.recordAudit({
      tenantId: args.tenantId,
      actorType: 'user',
      actorId: args.actor.id,
      action: 'sign.request.cancelled',
      targetType: 'sign_request',
      targetId: req.id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
    return { ok: true };
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
