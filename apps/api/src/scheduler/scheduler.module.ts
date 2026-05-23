import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { TenantLifecycleService } from './tenant-lifecycle.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SchedulerService, TenantLifecycleService],
  exports: [SchedulerService, TenantLifecycleService],
})
export class SchedulerModule {}
