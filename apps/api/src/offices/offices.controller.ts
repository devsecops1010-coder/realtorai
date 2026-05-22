import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OfficesService } from './offices.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('offices')
export class OfficesController {
  constructor(private readonly offices: OfficesService) {}

  @Get('current')
  current() {
    return this.offices.getCurrent();
  }

  @Patch('current')
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('office.update', { targetType: 'office' })
  updateCurrent(@Body() dto: UpdateOfficeDto) {
    return this.offices.updateCurrent(dto);
  }

  @Post()
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('office.create', { targetType: 'office' })
  create(@Body() dto: CreateOfficeDto) {
    return this.offices.create(dto);
  }

  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.offices.getById(id);
  }
}
