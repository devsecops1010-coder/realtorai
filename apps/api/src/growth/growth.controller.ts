import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GrowthService } from './growth.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('growth')
@Roles(
  UserRole.platform_admin,
  UserRole.ceo,
  UserRole.deputy_ceo,
  UserRole.district_manager,
  UserRole.branch_manager,
  UserRole.office_owner,
  UserRole.office_manager,
  UserRole.team_lead,
  UserRole.realtor,
  UserRole.marketing_manager,
  UserRole.secretary,
)
export class GrowthController {
  constructor(private readonly growth: GrowthService) {}

  @Get('overview')
  overview(): Promise<unknown> {
    return this.growth.overview();
  }

  @Get('properties/:id/launch-plan')
  launchPlan(@Param('id', new ParseUUIDPipe()) id: string): Promise<unknown> {
    return this.growth.propertyLaunchPlan(id);
  }

  @Post('properties/:id/draft-campaign')
  @Audit('growth.campaign.draft', { targetType: 'property' })
  draftCampaign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { platforms?: string[] } = {},
  ): Promise<unknown> {
    return this.growth.draftCampaign(id, body.platforms);
  }
}
