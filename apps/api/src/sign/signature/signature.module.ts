import { Module } from '@nestjs/common';
import { SignDocumentsModule } from '../documents/documents.module';
import { SignSignatureController } from './signature.controller';
import { SignSignatureService } from './signature.service';

@Module({
  imports: [SignDocumentsModule],
  controllers: [SignSignatureController],
  providers: [SignSignatureService],
  exports: [SignSignatureService],
})
export class SignSignatureModule {}
