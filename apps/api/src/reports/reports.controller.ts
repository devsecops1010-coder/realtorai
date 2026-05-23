import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('today')
  today() {
    return this.reports.today();
  }

  @Get('usage')
  usage() {
    return this.reports.usageSummary();
  }

  @Get('funnel')
  funnel() {
    return this.reports.funnel();
  }
}
