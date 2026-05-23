import { Controller, Get, Header, Res } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { ExportsService } from './exports.service';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('leads.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="leads.csv"')
  @Audit('export.leads')
  async leads(@Res({ passthrough: true }) res: Response) {
    const csv = await this.exports.leadsCsv();
    res.send('﻿' + csv); // BOM for Excel UTF-8
  }

  @Get('tasks.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tasks.csv"')
  @Audit('export.tasks')
  async tasks(@Res({ passthrough: true }) res: Response) {
    const csv = await this.exports.tasksCsv();
    res.send('﻿' + csv);
  }

  @Get('conversations.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="conversations.csv"')
  @Audit('export.conversations')
  async conversations(@Res({ passthrough: true }) res: Response) {
    const csv = await this.exports.conversationsCsv();
    res.send('﻿' + csv);
  }

  /**
   * GDPR-style full export: returns a single JSON document containing every
   * row across leads, properties, tasks, conversations, messages, and
   * mortgage data for the current tenant. The user can save it locally and
   * inspect / migrate.
   *
   * Limited to office-owner+ roles because the document holds the entire
   * client list — not something a junior realtor needs read access to in
   * one go.
   */
  @Get('full.json')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="realtorai-export.json"')
  @Roles(
    UserRole.office_owner,
    UserRole.office_manager,
    UserRole.ceo,
    UserRole.deputy_ceo,
    UserRole.platform_admin,
    UserRole.platform_owner,
  )
  @Audit('export.full')
  async fullExport(@Res({ passthrough: true }) res: Response) {
    const data = await this.exports.fullTenantExport();
    res.send(JSON.stringify(data, null, 2));
  }
}
