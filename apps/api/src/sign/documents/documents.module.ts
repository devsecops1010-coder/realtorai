import { Module } from '@nestjs/common';
import { SignDocumentsController } from './documents.controller';
import { SignDocumentsService } from './documents.service';

@Module({
  controllers: [SignDocumentsController],
  providers: [SignDocumentsService],
  exports: [SignDocumentsService],
})
export class SignDocumentsModule {}
