import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

/**
 * Web Push notifications. Service is exported so other modules (orchestrator,
 * scheduler) can call `push.sendToUser()` after they create an in-app
 * Notification row.
 */
@Module({
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
