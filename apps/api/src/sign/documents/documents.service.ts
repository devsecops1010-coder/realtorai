import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SignDocumentStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SignStorageService } from '../storage/storage.service';

@Injectable()
export class SignDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SignStorageService,
  ) {}

  async upload(args: {
    user: { id: string; tenantId: string };
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number };
    ipAddress?: string;
    userAgent?: string;
    /**
     * Optional CRM links. When set, the document is grouped on the lead /
     * property pages. Both fields are validated against the caller's tenant
     * to prevent a malicious client from attaching a document to a foreign
     * lead/property by id-guessing.
     */
    leadId?: string;
    propertyId?: string;
  }) {
    if (args.file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted');
    }
    if (args.file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 25 MB limit');
    }

    // Validate the FKs belong to the caller's tenant. Cheaper to do this
    // before the file write than to clean up an orphaned blob later.
    if (args.leadId) {
      const lead = await this.prisma.unscoped().lead.findFirst({
        where: { id: args.leadId, tenantId: args.user.tenantId },
        select: { id: true },
      });
      if (!lead) throw new BadRequestException('Unknown leadId for this tenant');
    }
    if (args.propertyId) {
      const property = await this.prisma.unscoped().property.findFirst({
        where: { id: args.propertyId, tenantId: args.user.tenantId },
        select: { id: true },
      });
      if (!property) throw new BadRequestException('Unknown propertyId for this tenant');
    }

    // Multer / busboy parses `filename` in multipart/form-data as latin1
    // bytes by default (RFC 7578 doesn't mandate a charset). For Hebrew /
    // Arabic / CJK filenames the original bytes are valid UTF-8 — so we
    // re-encode by reading the raw bytes back as latin1 and decoding as
    // UTF-8. The check `looksLatin1Mojibake` avoids double-decoding when
    // the client (rarely) sent RFC-5987 `filename*=UTF-8''...` correctly.
    const fileName = decodeMultipartFilename(args.file.originalname);

    const hash = createHash('sha256').update(args.file.buffer).digest('hex');
    const path = await this.storage.save(args.file.buffer, 'documents', fileName);

    const doc = await this.prisma.unscoped().signDocument.create({
      data: {
        tenantId: args.user.tenantId,
        uploadedByUserId: args.user.id,
        leadId: args.leadId ?? null,
        propertyId: args.propertyId ?? null,
        originalFileName: fileName,
        originalFilePath: path,
        documentHash: hash,
        status: SignDocumentStatus.draft,
      },
    });

    await this.recordAudit({
      tenantId: doc.tenantId,
      actorType: 'user',
      actorId: args.user.id,
      action: 'sign.document.uploaded',
      targetType: 'sign_document',
      targetId: doc.id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: {
        fileName: doc.originalFileName,
        sizeBytes: args.file.size,
        sha256: hash,
        ...(args.leadId ? { leadId: args.leadId } : {}),
        ...(args.propertyId ? { propertyId: args.propertyId } : {}),
      },
    });

    return doc;
  }

  list(tenantId: string, opts: { leadId?: string; propertyId?: string } = {}) {
    return this.prisma.unscoped().signDocument.findMany({
      where: {
        tenantId,
        ...(opts.leadId ? { leadId: opts.leadId } : {}),
        ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        signatureRequest: {
          select: { id: true, signerName: true, signerEmail: true, status: true },
        },
        lead: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        property: {
          select: { id: true, city: true, area: true, street: true, dealType: true },
        },
      },
    });
  }

  async getById(tenantId: string, id: string) {
    const doc = await this.prisma.unscoped().signDocument.findFirst({
      where: { id, tenantId },
      include: {
        signatureRequest: true,
        signature: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
        lead: {
          select: { id: true, fullName: true, phone: true, email: true, officeId: true },
        },
        property: {
          select: { id: true, city: true, area: true, street: true, dealType: true, officeId: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async download(tenantId: string, id: string, opts: { signed?: boolean } = {}) {
    const doc = await this.getById(tenantId, id);
    const path = opts.signed ? doc.signedFilePath : doc.originalFilePath;
    if (!path) throw new NotFoundException(opts.signed ? 'No signed copy yet' : 'No original file');
    return { fileName: doc.originalFileName, buffer: await this.storage.read(path) };
  }

  async listAuditForDocument(tenantId: string, id: string) {
    // Confirm doc belongs to tenant before exposing trail
    const doc = await this.getById(tenantId, id);
    // Events come in two flavors:
    //   - targetType='sign_document', targetId=docId   (upload, signed, pdf.generated, downloaded)
    //   - targetType='sign_request',  targetId=requestId (request lifecycle: created, email,
    //     link.opened, otp.sent, otp.verified, signature.drawn, consent.checked, cancelled)
    // So we OR over both, anchoring the request branch via the doc's
    // signatureRequest.id (if any).
    const requestId = doc.signatureRequest?.id ?? null;
    return this.prisma.unscoped().auditLog.findMany({
      where: {
        tenantId,
        OR: [
          { targetType: 'sign_document', targetId: id },
          ...(requestId ? [{ targetType: 'sign_request' as const, targetId: requestId }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Helper exposed to other sign services so they can write to the shared
  // audit_logs table directly without an extra dependency.
  async recordAudit(args: {
    tenantId: string;
    actorType: string;
    actorId?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.unscoped().auditLog.create({
      data: {
        tenantId: args.tenantId,
        actorType: args.actorType,
        actorId: args.actorId ?? null,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId,
        metadata: {
          ...(args.metadata ?? {}),
          ...(args.ipAddress ? { ipAddress: args.ipAddress } : {}),
          ...(args.userAgent ? { userAgent: args.userAgent } : {}),
        } as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Re-encode a multipart filename that was parsed as latin1 back into UTF-8.
 *
 * Why this is needed:
 *   - RFC 7578 doesn't mandate a charset for `Content-Disposition: filename`.
 *     Browsers send the bytes verbatim. For non-ASCII filenames the bytes
 *     ARE the UTF-8 representation.
 *   - busboy (which Multer uses) reads those bytes as latin1 by default —
 *     each byte becomes a code point ≤ 0xFF. So UTF-8 `D7 9B` ("כ", 0x5DB
 *     when properly decoded) becomes the two-char string "×\x9B" (mojibake).
 *
 * Detection (`looksLikeLatin1Mojibake`): if the string roundtrips through
 * `latin1 → utf-8` cleanly AND the result has fewer replacement chars and
 * isn't all ASCII, we assume it was double-encoded.
 *
 * If the client sent RFC 5987 `filename*=UTF-8''...` (rare in form posts),
 * the value is already decoded correctly and we leave it alone.
 *
 * Exported for unit testing.
 */
export function decodeMultipartFilename(raw: string | undefined | null): string {
  if (!raw) return 'unnamed.pdf';

  // Pure ASCII — nothing to do.
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(raw)) return raw;

  // Already valid UTF-8 with proper Unicode chars (e.g. Hebrew letter blocks
  // 0x0590-0x05FF, Arabic 0x0600-0x06FF, CJK > 0x4E00). If we see any of
  // those, the string was decoded correctly — no further work.
  if (/[֐-׿؀-ۿ一-鿿]/.test(raw)) return raw;

  // Try latin1 → utf-8 round-trip. If the result contains "real" non-ASCII
  // characters (Hebrew etc.) that's the right interpretation.
  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf-8');
    if (/[֐-׿؀-ۿ一-鿿]/.test(decoded)) {
      return decoded;
    }
    // No proper Unicode emerged — leave original. Better to keep the user's
    // bytes than to introduce mojibake of our own.
    return raw;
  } catch {
    return raw;
  }
}
