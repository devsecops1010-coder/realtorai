import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@Query('unreadOnly') unreadOnly?: string) {
    return this.svc.listMine({ unreadOnly: unreadOnly === 'true' });
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  read(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.markRead(id);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead() {
    const count = await this.svc.markAllRead();
    return { count };
  }
}
