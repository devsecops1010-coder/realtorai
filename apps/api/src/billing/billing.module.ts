import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingService } from './billing.service';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
