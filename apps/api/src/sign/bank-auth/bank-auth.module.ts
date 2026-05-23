import { Module } from '@nestjs/common';
import { SignDocumentsModule } from '../documents/documents.module';
import { SignStorageModule } from '../storage/storage.module';
import { BankAuthController } from './bank-auth.controller';
import { BankAuthService } from './bank-auth.service';
import { BankAuthPdfService } from './bank-auth-pdf.service';

/**
 * Bank Authorization templates — fills out the original bank PDFs by either
 * the AcroForm (Discount) or an overlay layer (all other banks). The
 * resulting filled PDF is persisted as a regular SignDocument so the rest
 * of the signing pipeline (request → email → OTP → sign → audit) just works.
 */
@Module({
  imports: [SignDocumentsModule, SignStorageModule],
  controllers: [BankAuthController],
  providers: [BankAuthService, BankAuthPdfService],
  exports: [BankAuthService],
})
export class BankAuthModule {}
