import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { SmartFollowupsService } from './smart-followups.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SchedulerService, TenantLifecycleService, SmartFollowupsService],
  exports: [SchedulerService, TenantLifecycleService, SmartFollowupsService],
})
export class SchedulerModule {}
