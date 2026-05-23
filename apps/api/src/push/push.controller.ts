import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PushService } from './push.service';
import type { Request } from 'express';

class SubscribeDto {
  @IsString() @MinLength(1) endpoint!: string;
  @IsString() @MinLength(1) p256dh!: string;
  @IsString() @MinLength(1) auth!: string;
}

class UnsubscribeDto {
  @IsString() @MinLength(1) endpoint!: string;
}

/**
 * Web Push subscription endpoints. Frontend wiring:
 *   1. GET /push/public-key — fetch the VAPID public key (or null if unset)
 *   2. navigator.serviceWorker.ready.then(reg => reg.pushManager.subscribe(...))
 *      using that key
 *   3. POST /push/subscribe with the resulting endpoint + keys
 *
 * Unsubscribe is symmetrical — frontend calls pushManager.unsubscribe() then
 * DELETE /push/subscribe so the server stops trying to push.
 */
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  // Public to authenticated users; the key itself is non-sensitive (it's by
  // design designed to be shared with browsers).
  publicKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@CurrentUser() user: JwtPayload, @Body() dto: SubscribeDto, @Req() req: Request) {
    const ua = req.headers['user-agent'];
    await this.push.subscribe({
      userId: user.sub,
      tenantId: user.tenantId,
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
      userAgent: typeof ua === 'string' ? ua.slice(0, 240) : undefined,
    });
    return { ok: true };
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@CurrentUser() user: JwtPayload, @Body() dto: UnsubscribeDto) {
    await this.push.unsubscribe(user.sub, dto.endpoint);
  }
}
