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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { BulkUploadOwnersDto } from './dto/bulk-upload.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  list() {
    return this.properties.list();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.properties.getById(id);
  }

  @Post()
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('property.create', { targetType: 'property' })
  create(@Body() dto: CreatePropertyDto) {
    return this.properties.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('property.update', { targetType: 'property' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePropertyDto) {
    return this.properties.update(id, dto);
  }

  @Post('bulk-upload-owners')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('property.bulk_upload', { targetType: 'property' })
  bulkUploadOwners(@Body() dto: BulkUploadOwnersDto) {
    return this.properties.bulkUploadOwners(dto);
  }
}
