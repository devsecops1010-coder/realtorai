import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const ACTIVATION_TTL_DAYS = 7;
const RESET_TTL_HOURS = 1;
const BCRYPT_COST = 12;

interface IssueResult {
  // Raw token to embed in the email link. NEVER stored — only the hash is.
  token: string;
  expiresAt: Date;
}

/**
 * Owns the account-lifecycle flows that aren't covered by AuthService.login
 * / register-tenant: issuing activation tokens for invited users, password
 * reset tokens for forgotten passwords, and verifying + consuming both.
 *
 * Tokens are 32 random bytes (256 bits, base64url) — only the SHA-256 hash
 * lives in the DB, so a DB leak can't be replayed. Both flows are
 * deliberately single-use (`usedAt` is set on consume) and short-TTL.
 */
@Injectable()
export class AuthLifecycleService {
  private readonly logger = new Logger(AuthLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // --- Activation (invited users → first login) ------------------------

  /**
   * Generate an activation token for a newly invited user and email it.
   * Called from UsersService.invite(). Idempotent-ish: a second invite for
   * the same user revokes the previous tokens and issues a fresh one.
   */
  async issueActivationForInvite(args: {
    userId: string;
    recipientEmail: string;
    recipientName: string;
    inviterName: string;
    officeName: string;
  }): Promise<void> {
    const { token, expiresAt } = await this.issueActivationToken(args.userId);
    try {
      await this.email.sendActivationInvite({
        to: args.recipientEmail,
        recipientName: args.recipientName,
        inviterName: args.inviterName,
        officeName: args.officeName,
        activationToken: token,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send activation email to ${args.recipientEmail}: ${(err as Error).message}`,
      );
      // The token is still in the DB; an admin can re-trigger by calling
      // issueActivationForInvite again. We don't fail the invite itself —
      // the user record is created and visible in /team.
    }
    void expiresAt;
  }

  private async issueActivationToken(userId: string): Promise<IssueResult> {
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    // Wipe any earlier unused tokens so the inviter always sees fresh state.
    await this.prisma.unscoped().activationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date(), expiresAt: new Date() },
    });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = sha256(token);
    await this.prisma.unscoped().activationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return { token, expiresAt };
  }

  /**
   * Validate an activation token without consuming it. Used by the web
   * /activate/[token] page to render a "set your password" form.
   */
  async previewActivation(token: string): Promise<{ email: string; name: string }> {
    const record = await this.findValidActivation(token);
    return { email: record.user.email, name: record.user.name };
  }

  /**
   * Consume the activation token: set the user's password, flip status to
   * active, mark token used. Wrapped in a transaction so a crash mid-flow
   * doesn't leave a half-activated account.
   */
  async completeActivation(token: string, password: string): Promise<{ userId: string }> {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const record = await this.findValidActivation(token);
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    await this.prisma.unscoped().$transaction([
      this.prisma.unscoped().user.update({
        where: { id: record.userId },
        data: { passwordHash, status: UserStatus.active },
      }),
      this.prisma.unscoped().activationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { userId: record.userId };
  }

  private async findValidActivation(token: string) {
    const tokenHash = sha256(token);
    const record = await this.prisma.unscoped().activationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true, status: true } } },
    });
    if (!record) throw new NotFoundException('Activation token not found');
    if (record.usedAt) throw new BadRequestException('Activation token already used');
    if (record.expiresAt < new Date()) throw new BadRequestException('Activation token expired');
    return record;
  }

  // --- Password reset --------------------------------------------------

  /**
   * Always returns success-shaped result regardless of whether the email
   * exists — defends against user enumeration. The email is only sent when
   * the user actually exists.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.unscoped().user.findFirst({
      where: { email: normalized },
      select: { id: true, email: true, name: true, status: true },
    });
    if (!user || user.status !== UserStatus.active) {
      // Silent return — don't leak which emails exist.
      this.logger.log(`password reset requested for unknown/inactive: ${normalized}`);
      return;
    }

    const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);
    // Same pattern as activation — invalidate prior unused tokens.
    await this.prisma.unscoped().passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date(), expiresAt: new Date() },
    });
    const token = randomBytes(32).toString('base64url');
    await this.prisma.unscoped().passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt },
    });

    try {
      await this.email.sendPasswordReset({
        to: user.email,
        recipientName: user.name,
        resetToken: token,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send password-reset email to ${user.email}: ${(err as Error).message}`,
      );
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const tokenHash = sha256(token);
    const record = await this.prisma.unscoped().passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record) throw new NotFoundException('Reset token not found');
    if (record.usedAt) throw new BadRequestException('Reset token already used');
    if (record.expiresAt < new Date()) throw new BadRequestException('Reset token expired');

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await this.prisma.unscoped().$transaction([
      this.prisma.unscoped().user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.unscoped().passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all live refresh tokens so a leaked session can't outlive a
      // password change.
      this.prisma.unscoped().refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
