import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MortgageStatus, ReferralStatus, UserRole } from '@prisma/client';
import { MortgageService } from './mortgage.service';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConsentDto } from './dto/consent.dto';
import { ReferDto } from './dto/refer.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('mortgage')
export class MortgageController {
  constructor(private readonly svc: MortgageService) {}

  // ----- Advisors -----

  @Get('advisors')
  listAdvisors() {
    return this.svc.listAdvisors();
  }

  @Get('advisors/:id')
  getAdvisor(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.getAdvisor(id);
  }

  @Post('advisors')
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('mortgage.advisor.create', { targetType: 'mortgage_advisor' })
  createAdvisor(@Body() dto: CreateAdvisorDto) {
    return this.svc.createAdvisor(dto);
  }

  @Patch('advisors/:id')
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('mortgage.advisor.update', { targetType: 'mortgage_advisor' })
  updateAdvisor(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAdvisorDto) {
    return this.svc.updateAdvisor(id, dto);
  }

  // ----- Profiles -----

  @Get('profiles')
  listProfiles(@Query('status') status?: MortgageStatus) {
    return this.svc.listProfiles(status);
  }

  @Get('profiles/:id')
  getProfile(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.getProfile(id);
  }

  @Post('profiles/by-lead/:leadId')
  @HttpCode(HttpStatus.OK)
  @Audit('mortgage.profile.create_or_get', { targetType: 'mortgage_profile' })
  getOrCreate(@Param('leadId', new ParseUUIDPipe()) leadId: string) {
    return this.svc.getOrCreateProfileForLead(leadId);
  }

  @Patch('profiles/:id')
  @Audit('mortgage.profile.update', { targetType: 'mortgage_profile' })
  updateProfile(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateProfileDto) {
    return this.svc.updateProfile(id, dto);
  }

  // ----- Consent -----

  @Post('profiles/:id/consent')
  @HttpCode(HttpStatus.OK)
  @Audit('mortgage.consent.record', { targetType: 'mortgage_profile' })
  consent(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ConsentDto) {
    return this.svc.recordConsent(id, dto);
  }

  // ----- Referrals -----

  @Post('profiles/:id/refer')
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('mortgage.referral.create', { targetType: 'mortgage_referral' })
  refer(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ReferDto) {
    return this.svc.refer(id, dto);
  }

  @Get('referrals')
  listReferrals(@Query('status') status?: ReferralStatus) {
    return this.svc.listReferrals(status);
  }

  @Patch('referrals/:id')
  @Audit('mortgage.referral.update', { targetType: 'mortgage_referral' })
  updateReferral(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { status: ReferralStatus; notes?: string },
  ) {
    return this.svc.updateReferralStatus(id, body.status, body.notes);
  }
}
