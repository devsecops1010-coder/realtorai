import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardOfficeDto } from './dto/onboard-office.dto';
import { Public } from '../common/decorators/public.decorator';
import { Audit } from '../common/decorators/audit.decorator';

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
}
