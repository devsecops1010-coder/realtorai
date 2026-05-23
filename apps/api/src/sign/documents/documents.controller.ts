import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { SignDocumentsService } from './documents.service';

@Controller('sign/documents')
export class SignDocumentsController {
  constructor(private readonly documents: SignDocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    // Multer merges multipart form fields into req.body; we accept the
    // optional CRM links there so the same /upload endpoint handles both
    // standalone uploads and lead/property-attached ones.
    @Body() body: { leadId?: string; propertyId?: string },
    @Req() req: Request,
  ) {
    return this.documents.upload({
      user: { id: user.sub, tenantId: user.tenantId },
      file,
      leadId: trimmedOrUndefined(body?.leadId),
      propertyId: trimmedOrUndefined(body?.propertyId),
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('leadId') leadId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.documents.list(user.tenantId, {
      leadId: trimmedOrUndefined(leadId),
      propertyId: trimmedOrUndefined(propertyId),
    });
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.documents.getById(user.tenantId, id);
  }

  @Get(':id/audit')
  audit(@CurrentUser() user: JwtPayload, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.documents.listAuditForDocument(user.tenantId, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { fileName, buffer } = await this.documents.download(user.tenantId, id);
    await this.documents.recordAudit({
      tenantId: user.tenantId,
      actorType: 'user',
      actorId: user.sub,
      action: 'sign.document.downloaded',
      targetType: 'sign_document',
      targetId: id,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
      metadata: { variant: 'original' },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  }

  /**
   * Streams the PDF inline (browser-renderable) instead of as an attachment.
   * Used by the in-app preview component on /documents/[id]. We audit this
   * as a `viewed` event — distinct from `downloaded` so we can tell whether
   * a user just glanced at the doc vs. saved a copy.
   *
   * Pass `?signed=true` to preview the signed version. Defaults to original.
   */
  @Get(':id/inline')
  async inline(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('signed') signed: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const wantSigned = signed === 'true' || signed === '1';
    const { fileName, buffer } = await this.documents.download(user.tenantId, id, {
      signed: wantSigned,
    });
    await this.documents.recordAudit({
      tenantId: user.tenantId,
      actorType: 'user',
      actorId: user.sub,
      action: 'sign.document.viewed',
      targetType: 'sign_document',
      targetId: id,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
      metadata: { variant: wantSigned ? 'signed' : 'original' },
    });
    res.setHeader('Content-Type', 'application/pdf');
    // `inline` makes the browser render in the iframe rather than prompt
    // for download. The filename is still attached for the rare case the
    // user opts to save via the PDF viewer's own controls.
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    // No caching — every preview re-fetches so revocation/cancel is honored.
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }

  @Get(':id/download-signed')
  async downloadSigned(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { fileName, buffer } = await this.documents.download(user.tenantId, id, { signed: true });
    await this.documents.recordAudit({
      tenantId: user.tenantId,
      actorType: 'user',
      actorId: user.sub,
      action: 'sign.document.downloaded',
      targetType: 'sign_document',
      targetId: id,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
      metadata: { variant: 'signed' },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="signed_${encodeURIComponent(fileName)}"`,
    );
    res.send(buffer);
  }
}

// Returns `undefined` for nullish / empty / whitespace-only strings so we
// don't pollute the Prisma filter with `leadId: ''`. Lives here so the
// signature isn't tied to a class.
function trimmedOrUndefined(v: string | null | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}
