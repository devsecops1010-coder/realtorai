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
