import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MortgageController } from './mortgage.controller';
import { MortgageService } from './mortgage.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MortgageController],
  providers: [MortgageService],
  exports: [MortgageService],
})
export class MortgageModule {}
