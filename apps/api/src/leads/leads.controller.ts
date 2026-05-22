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
import { UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { OptOutLeadDto } from './dto/opt-out-lead.dto';
import { ListLeadsQuery } from './dto/list-leads.query';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query() query: ListLeadsQuery) {
    return this.leads.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.getById(id);
  }

  @Post()
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('lead.create', { targetType: 'lead' })
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('lead.update', { targetType: 'lead' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('lead.assign', { targetType: 'lead' })
  assign(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AssignLeadDto) {
    return this.leads.assign(id, dto);
  }

  @Post(':id/opt-out')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('lead.opt_out', { targetType: 'lead' })
  optOut(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: OptOutLeadDto) {
    return this.leads.optOut(id, dto);
  }
}
