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
import { Throttle } from '@nestjs/throttler';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { BulkUploadOwnersDto } from './dto/bulk-upload.dto';
import { CreatePublicPropertyLeadDto } from './dto/create-public-property-lead.dto';
import { PublicPropertySearchQuery } from './dto/public-property-search.query';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @RequirePermission('property.view')
  list() {
    return this.properties.list();
  }

  @Public()
  @Get('public/search')
  publicSearch(@Query() query: PublicPropertySearchQuery) {
    return this.properties.publicSearch(query);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('public/:id/leads')
  @HttpCode(HttpStatus.CREATED)
  publicLead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreatePublicPropertyLeadDto,
  ) {
    return this.properties.createPublicLead(id, dto);
  }

  @Get(':id')
  @RequirePermission('property.view')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.properties.getById(id);
  }

  @Post()
  @RequirePermission('property.create')
  @Audit('property.create', { targetType: 'property' })
  create(@Body() dto: CreatePropertyDto) {
    return this.properties.create(dto);
  }

  @Patch(':id')
  @RequirePermission('property.create')
  @Audit('property.update', { targetType: 'property' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePropertyDto) {
    return this.properties.update(id, dto);
  }

  @Post('bulk-upload-owners')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('property.create')
  @Audit('property.bulk_upload', { targetType: 'property' })
  bulkUploadOwners(@Body() dto: BulkUploadOwnersDto) {
    return this.properties.bulkUploadOwners(dto);
  }
}
