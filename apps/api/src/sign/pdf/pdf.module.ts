import { Global, Module } from '@nestjs/common';
import { SignPdfService } from './pdf.service';

@Global()
@Module({
  providers: [SignPdfService],
  exports: [SignPdfService],
})
export class SignPdfModule {}
