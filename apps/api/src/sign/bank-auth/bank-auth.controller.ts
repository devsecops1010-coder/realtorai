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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { BankAuthService } from './bank-auth.service';
import type { BankAuthValues } from './types';

interface ResolveQuery {
  leadId: string;
  advisorId?: string;
}

interface PreviewBody {
  bankSlug: string;
  values: BankAuthValues;
}

interface CreateBody {
  bankSlug: string;
  leadId: string;
  values: BankAuthValues;
}

@Controller('sign/bank-auth')
export class BankAuthController {
  constructor(private readonly bankAuth: BankAuthService) {}

  /**
   * Bank picker. Returns the list of active templates so the UI can render
   * radio buttons / a select.
   */
  @Get('templates')
  listTemplates() {
    return this.bankAuth.list();
  }

  /**
   * Returns the auto-filled values for a lead — walks the mortgage profile,
   * referrals, and advisor to collect everything we know. The UI uses this
   * to pre-populate the dialog and surface missing fields.
   */
  @Get('resolve/:leadId')
  resolve(
    @CurrentUser() user: JwtPayload,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Query('advisorId') advisorId?: string,
  ) {
    return this.bankAuth.resolveValuesForLead({
      tenantId: user.tenantId,
      leadId,
      advisorId,
    });
  }

  /**
   * Renders the filled PDF and streams it inline. Used by the dialog's
   * preview pane — caller does NOT need to download or store anything.
   */
  @Post('preview')
  async preview(
    @CurrentUser() user: JwtPayload,
    @Body() body: PreviewBody,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.bankAuth.preview({
      tenantId: user.tenantId,
      bankSlug: body.bankSlug,
      values: body.values,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }

  /**
   * Generates the filled PDF, saves it as a SignDocument(status=draft)
   * linked to the lead, and returns the doc so the caller can chain into
   * POST /sign/signature-requests.
   */
  @Post('create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateBody,
    @Req() req: Request,
  ) {
    return this.bankAuth.createDocument({
      user: { id: user.sub, tenantId: user.tenantId },
      bankSlug: body.bankSlug,
      leadId: body.leadId,
      values: body.values,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
  }
}
