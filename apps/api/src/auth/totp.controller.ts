import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TotpService, isValidTotpCode } from './totp.service';

class EnrollConfirmDto {
  @IsString() @Length(6, 6) code!: string;
  @IsString() @Length(16, 64) secret!: string;
}

class DisableTotpDto {
  @IsString() @Length(6, 16) code!: string; // either a 6-digit TOTP or an 11-char recovery
}

/**
 * 2FA management endpoints (authenticated user managing their own 2FA).
 *
 * Verify-during-login is NOT here — that's part of AuthController.login()
 * because it happens before the session JWT is issued. Only the
 * already-logged-in self-service flows live here.
 */
@Controller('auth/2fa')
export class TotpController {
  constructor(
    private readonly totp: TotpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Start enrollment. Returns secret + QR code data URL. Frontend shows the
   * QR + asks the user to scan + enter the first code to confirm.
   */
  @Post('enroll/start')
  @Audit('auth.2fa.enroll_start', { targetType: 'user' })
  async enrollStart(@CurrentUser() user: JwtPayload) {
    // JwtPayload only carries sub/tenantId/role — fetch email + name for
    // the otpauth label so the user sees their real address in Google
    // Authenticator rather than a raw UUID.
    const u = await this.prisma.unscoped().user.findUnique({
      where: { id: user.sub },
      select: { email: true },
    });
    return this.totp.enrollStart({
      userId: user.sub,
      email: u?.email ?? user.sub,
      issuerName: 'Realtorai',
    });
  }

  /**
   * Confirm enrollment by submitting the 6-digit code generated from the
   * candidate secret. Returns the one-time recovery codes — the only place
   * the user ever sees them in plaintext.
   */
  @Post('enroll/confirm')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.2fa.enabled', { targetType: 'user' })
  async enrollConfirm(@CurrentUser() user: JwtPayload, @Body() dto: EnrollConfirmDto) {
    if (!isValidTotpCode(dto.code)) {
      throw new BadRequestException('Code must be 6 digits');
    }
    return this.totp.enrollConfirm({
      userId: user.sub,
      secret: dto.secret,
      code: dto.code,
    });
  }

  /**
   * Disable 2FA. Requires the user to enter a current TOTP code (or a
   * recovery code) so a hijacked session can't silently disable protection.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit('auth.2fa.disabled', { targetType: 'user' })
  async disable(@CurrentUser() user: JwtPayload, @Body() dto: DisableTotpDto) {
    // 6-digit codes → TOTP. Anything else → try as recovery code.
    let verified: boolean;
    if (isValidTotpCode(dto.code)) {
      verified = await this.totp.verify(user.sub, dto.code);
    } else {
      verified = await this.totp.consumeRecoveryCode(user.sub, dto.code.toUpperCase());
    }
    if (!verified) throw new UnauthorizedException('Invalid code');
    await this.totp.disable(user.sub);
  }

  /** Lightweight check used by the settings page. */
  @Post('status')
  @HttpCode(HttpStatus.OK)
  async status(@CurrentUser() user: JwtPayload) {
    const enabled = await this.totp.isEnabled(user.sub);
    return { enabled };
  }
}
