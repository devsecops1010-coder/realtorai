import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportsService } from './exports.service';
import { Audit } from '../common/decorators/audit.decorator';

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
}
