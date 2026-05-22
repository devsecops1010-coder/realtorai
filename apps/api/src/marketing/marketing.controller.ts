import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactRequestStatus, UserRole } from '@prisma/client';
import { MarketingService } from './marketing.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { Public } from '../common/decorators/public.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller()
export class MarketingController {
  constructor(private readonly svc: MarketingService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @Audit('contact_request.create', { targetType: 'contact_request' })
  create(@Body() dto: CreateContactRequestDto, @Ip() ip: string) {
    return this.svc.createContactRequest(dto, ip);
  }

  @Get('admin/contact-requests')
  @Roles(UserRole.platform_admin)
  list(@Query('status') status?: ContactRequestStatus) {
    return this.svc.list(status);
  }

  @Patch('admin/contact-requests/:id')
  @Roles(UserRole.platform_admin)
  @Audit('contact_request.update', { targetType: 'contact_request' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { status: ContactRequestStatus },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.markStatus(id, body.status, user.sub);
  }
}
