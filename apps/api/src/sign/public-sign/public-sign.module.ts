import { Module } from '@nestjs/common';
import { SignDocumentsModule } from '../documents/documents.module';
import { SignPublicController } from './public-sign.controller';
import { SignPublicService } from './public-sign.service';

@Module({
  imports: [SignDocumentsModule],
  controllers: [SignPublicController],
  providers: [SignPublicService],
})
export class SignPublicModule {}
