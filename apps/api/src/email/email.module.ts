import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

// @Global so any module can inject EmailService without listing it as an
// import — sending email is a cross-cutting concern.
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
