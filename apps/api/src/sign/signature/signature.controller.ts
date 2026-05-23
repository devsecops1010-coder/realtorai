import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { SignSignatureService } from './signature.service';
import { CreateSignatureRequestDto } from './dto';

@Controller('sign/signature-requests')
export class SignSignatureController {
  constructor(private readonly signature: SignSignatureService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSignatureRequestDto,
    @Req() req: Request,
  ) {
    return this.signature.create({
      user: { id: user.sub, tenantId: user.tenantId },
      dto,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.signature.list(user.tenantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ) {
    return this.signature.cancel({
      tenantId: user.tenantId,
      actor: { id: user.sub },
      requestId: id,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
  }
}
