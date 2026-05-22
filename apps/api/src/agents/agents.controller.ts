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
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AgentsService } from './agents.service';
import { AgentOrchestratorService } from './orchestrator.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { TestAgentDto } from './dto/test-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly orchestrator: AgentOrchestratorService,
  ) {}

  @Get()
  list() {
    return this.agents.list();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agents.getById(id);
  }

  @Patch(':id/config')
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('agent.config_update', { targetType: 'agent' })
  updateConfig(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAgentConfigDto) {
    return this.agents.updateConfig(id, dto);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('agent.test', { targetType: 'agent' })
  test(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TestAgentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orchestrator.runTest(user.tenantId, id, dto.message, {
      phone: dto.leadPhone,
      fullName: dto.leadName,
    });
  }
}
