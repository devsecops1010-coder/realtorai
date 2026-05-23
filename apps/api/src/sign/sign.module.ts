import { Module } from '@nestjs/common';
import { SignStorageModule } from './storage/storage.module';
import { SignPdfModule } from './pdf/pdf.module';
import { SignDocumentsModule } from './documents/documents.module';
import { SignSignatureModule } from './signature/signature.module';
import { SignPublicModule } from './public-sign/public-sign.module';
import { BankAuthModule } from './bank-auth/bank-auth.module';

/**
 * Sign module — PDF signing platform integrated into realtorai.
 *
 * Reuses tenant scoping (Tenant FK), Users, AuditLog (action/targetType
 * pattern), EmailService, and CsrfMiddleware from the host app. Adds:
 *   - SignDocument / SignSignatureRequest / SignSignature DB tables
 *   - /sign/documents, /sign/signature-requests (authenticated)
 *   - /sign/public/sign/:token (public — JWT bypassed via @Public())
 *   - SignStorageService for PDF/PNG files (separate from realtorai assets)
 *   - SignPdfService for embedding signatures + audit trail page
 */
@Module({
  imports: [
    SignStorageModule,
    SignPdfModule,
    SignDocumentsModule,
    SignSignatureModule,
    SignPublicModule,
    BankAuthModule,
  ],
})
export class SignModule {}
