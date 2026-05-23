import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
// otplib v12 — stable sync API (`authenticator.check`, `generateSecret`,
// `keyuri`). v13 went async + class-instance based which adds friction here.
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TOTP-based 2FA for high-privilege accounts (platform_owner / platform_admin).
 *
 * Flow:
 *   1. enrollStart()    — generate secret + return otpauth URI + QR
 *   2. enrollConfirm()  — user submits a 6-digit code; we verify against the
 *                         secret and only persist on success (so a failed
 *                         enrollment doesn't leave a dangling unverified secret).
 *   3. verify()         — used by login flow once 2FA is enabled.
 *   4. disable()        — wipes the secret, used by user or by an admin
 *                         resetting another user's 2FA.
 *
 * Recovery codes: 8 one-time codes generated at enroll time, shown ONCE to
 * the user, stored as bcrypt hashes. consume() marks a code as used (by
 * removing the hash from the array).
 *
 * Window: ±1 step (30s before / 30s after) to tolerate clock skew. Matches
 * Google Authenticator's default verification window.
 */
@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);

  constructor(private readonly prisma: PrismaService) {
    // 6-digit codes, 30-second period — standard TOTP defaults
    authenticator.options = { window: 1, digits: 6, step: 30 };
  }

  /**
   * Start enrollment. Returns the secret (so the user can store it manually)
   * + a QR code data URL (so they can scan with Google Authenticator/etc).
   * The secret is NOT yet persisted — only after `enrollConfirm()` succeeds.
   */
  async enrollStart(args: {
    userId: string;
    email: string;
    issuerName?: string;
  }): Promise<{ secret: string; otpAuthUrl: string; qrCodeDataUrl: string }> {
    const existing = await this.prisma.unscoped().user.findUnique({
      where: { id: args.userId },
      select: { totpEnabledAt: true },
    });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.totpEnabledAt) {
      throw new ConflictException('2FA already enabled. Disable first to re-enroll.');
    }

    const secret = authenticator.generateSecret();
    const issuer = args.issuerName ?? 'Realtorai';
    const otpAuthUrl = authenticator.keyuri(args.email, issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return { secret, otpAuthUrl, qrCodeDataUrl };
  }

  /**
   * Confirm enrollment — verify the 6-digit code against the candidate
   * secret, and only on success persist `totpSecret` + `totpEnabledAt` +
   * `totpRecoveryCodes` (hashed). Returns the plaintext recovery codes
   * for one-time display.
   */
  async enrollConfirm(args: {
    userId: string;
    secret: string;
    code: string;
  }): Promise<{ recoveryCodes: string[] }> {
    if (!authenticator.check(args.code, args.secret)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Generate 8 recovery codes (10-char base32, dash in the middle for
    // human readability). Store bcrypt hashes; show plaintext exactly once.
    const recoveryCodes = Array.from({ length: 8 }, () => this.generateRecoveryCode());
    const hashes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)));

    await this.prisma.unscoped().user.update({
      where: { id: args.userId },
      data: {
        totpSecret: args.secret,
        totpEnabledAt: new Date(),
        totpRecoveryCodes: hashes,
      },
    });

    this.logger.log(`2FA enrolled for user ${args.userId}`);
    return { recoveryCodes };
  }

  /**
   * Verify a login-time TOTP code. Returns true on success. Caller decides
   * what to do on false (typically reject the login).
   */
  async verify(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.unscoped().user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabledAt: true },
    });
    if (!user?.totpSecret || !user.totpEnabledAt) return false;
    return authenticator.check(code, user.totpSecret);
  }

  /**
   * Verify a recovery code. On success, removes the used hash so each code
   * is truly one-time. Returns true if matched.
   */
  async consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.unscoped().user.findUnique({
      where: { id: userId },
      select: { totpRecoveryCodes: true },
    });
    if (!user?.totpRecoveryCodes) return false;
    const hashes = user.totpRecoveryCodes as string[];
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(code, hashes[i])) {
        const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
        await this.prisma.unscoped().user.update({
          where: { id: userId },
          data: { totpRecoveryCodes: remaining },
        });
        this.logger.warn(`Recovery code consumed for user ${userId}; ${remaining.length} remaining`);
        return true;
      }
    }
    return false;
  }

  /**
   * Disable 2FA. Used by:
   *   - The user themselves after entering their current TOTP code (verified
   *     by the caller before invoking this).
   *   - A platform admin resetting another user's 2FA (e.g. lost device).
   *     That path should write a separate AuditLog entry.
   */
  async disable(userId: string): Promise<void> {
    await this.prisma.unscoped().user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpEnabledAt: null,
        // Prisma's Json typing requires the explicit `Prisma.JsonNull`
        // sentinel for nullable JSON columns rather than a literal `null`.
        totpRecoveryCodes: Prisma.JsonNull,
      },
    });
    this.logger.log(`2FA disabled for user ${userId}`);
  }

  /** Is 2FA enabled for this user? */
  async isEnabled(userId: string): Promise<boolean> {
    const u = await this.prisma.unscoped().user.findUnique({
      where: { id: userId },
      select: { totpEnabledAt: true },
    });
    return Boolean(u?.totpEnabledAt);
  }

  /**
   * Generate a single recovery code. Format: "XXXXX-XXXXX" where X is a
   * base32 character (no ambiguous 0/O/1/I/L). Total entropy ~50 bits which
   * is fine since codes are one-time and bound to a specific user.
   */
  private generateRecoveryCode(): string {
    const alphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    const chunk = (n: number) =>
      Array.from(randomBytes(n))
        .map((b) => alphabet[b % alphabet.length])
        .join('');
    return `${chunk(5)}-${chunk(5)}`;
  }
}

// Re-export the validation helper for use in DTOs without importing otplib.
export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// Stub usage to keep the imports semantically tied — BadRequestException
// is used in the consuming controller below.
export const _BAD_REQUEST = BadRequestException;
