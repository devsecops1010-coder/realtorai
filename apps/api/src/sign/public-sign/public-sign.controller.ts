import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SignPublicService } from './public-sign.service';
import { SubmitSignatureDto, VerifyOtpDto } from './dto';

/**
 * Public signing endpoints. The `@Public()` decorator marks them as
 * not-requiring JWT. The URL token + (later) OTP are the only auth.
 */
@Controller('sign/public/sign/:token')
export class SignPublicController {
  constructor(private readonly publicSign: SignPublicService) {}

  @Public()
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preview(@Param('token') token: string, @Req() req: Request) {
    return this.publicSign.preview(token, ctx(req));
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  sendOtp(@Param('token') token: string, @Req() req: Request) {
    return this.publicSign.sendOtp(token, ctx(req));
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(
    @Param('token') token: string,
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ) {
    return this.publicSign.verifyOtp(token, dto, ctx(req));
  }

  @Public()
  @Get('document')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async getDocument(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.publicSign.getDocument(token, ctx(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  }

  @Public()
  @Post('submit-signature')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @Param('token') token: string,
    @Body() dto: SubmitSignatureDto,
    @Req() req: Request,
  ) {
    return this.publicSign.submitSignature(token, dto, ctx(req));
  }
}

function ctx(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}
