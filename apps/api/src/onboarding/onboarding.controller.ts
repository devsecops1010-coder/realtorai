import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { OnboardOfficeDto } from './dto/onboard-office.dto';
import { Public } from '../common/decorators/public.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('onboarding.complete', { targetType: 'tenant' })
  onboard(@Body() dto: OnboardOfficeDto) {
    return this.svc.onboard(dto);
  }

  /**
   * Seeds a small set of demo data (leads, properties, mortgage profile)
   * into the current tenant so the user can explore the UI before they have
   * real data. Idempotent-ish — running it twice creates two batches; we
   * lean on tenants resetting via the admin tools rather than trying to
   * detect dedupe here.
   *
   * Restricted to office-owner+manager so a junior realtor can't pollute the
   * pipeline by accident.
   */
  @Post('sample-data')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.office_owner,
    UserRole.office_manager,
    UserRole.ceo,
    UserRole.deputy_ceo,
    UserRole.platform_admin,
    UserRole.platform_owner,
  )
  @Audit('onboarding.sample_data', { targetType: 'tenant' })
  sampleData() {
    return this.svc.seedSampleData();
  }
}
