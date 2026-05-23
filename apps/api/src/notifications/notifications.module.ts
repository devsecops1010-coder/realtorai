import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushModule } from '../push/push.module';

// @Global so notification.service can be injected anywhere without listing
// it in each consuming module. PushModule is imported here (not @Global) so
// NotificationsService can call `push.sendToUser()` when an alert is
// broadcast — see notifications.service.ts for the fanout logic.
@Global()
@Module({
  imports: [PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
