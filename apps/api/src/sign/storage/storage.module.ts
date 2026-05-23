import { Global, Module } from '@nestjs/common';
import { SignStorageService } from './storage.service';

@Global()
@Module({
  providers: [SignStorageService],
  exports: [SignStorageService],
})
export class SignStorageModule {}
