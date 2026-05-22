import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, UserStatus, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env.schema';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { RegisterTenantDto } from './dto/register-tenant.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  officeId: string | null;
  name: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async registerTenant(dto: RegisterTenantDto): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const emailLc = dto.email.toLowerCase().trim();
    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    try {
      const result = await this.prisma.unscoped().$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.tenantName.trim(),
            status: TenantStatus.trial,
            plan: 'starter',
          },
        });

        const office = await tx.office.create({
          data: {
            tenantId: tenant.id,
            name: dto.officeName.trim(),
            city: dto.city?.trim() ?? null,
            status: 'active',
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            officeId: office.id,
            name: dto.ownerName.trim(),
            email: emailLc,
            role: UserRole.office_owner,
            status: UserStatus.active,
            passwordHash,
          },
        });

        return { tenant, office, user };
      });

      const tokens = await this.issueTokens(result.user.id, result.tenant.id, result.office.id, result.user.role);
      return {
        user: this.toAuthenticatedUser(result.user),
        tokens,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already in use for this tenant');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const emailLc = email.toLowerCase().trim();
    const user = await this.prisma.unscoped().user.findFirst({
      where: { email: emailLc, status: UserStatus.active },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.unscoped().user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.tenantId, user.officeId, user.role);
    return {
      user: this.toAuthenticatedUser(user),
      tokens,
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawRefreshToken, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }

    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const stored = await this.prisma.unscoped().refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }
    if (stored.userId !== payload.sub) {
      throw new UnauthorizedException('Token user mismatch');
    }

    await this.prisma.unscoped().refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.tenantId,
      stored.user.officeId,
      stored.user.role,
    );
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.unscoped().refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.unscoped().user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.toAuthenticatedUser(user);
  }

  private async issueTokens(
    userId: string,
    tenantId: string,
    officeId: string | null,
    role: UserRole,
  ): Promise<AuthTokens> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    const secret = this.config.get('JWT_SECRET', { infer: true });

    const accessPayload: JwtPayload = {
      sub: userId,
      tenantId,
      officeId,
      role,
      type: 'access',
      jti: randomUUID(),
    };
    const refreshPayload: JwtPayload = { ...accessPayload, type: 'refresh', jti: randomUUID() };

    const accessToken = await this.jwt.signAsync(accessPayload as object, {
      secret,
      expiresIn: accessTtl as never,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload as object, {
      secret,
      expiresIn: refreshTtl as never,
    });

    const expiresAt = new Date(Date.now() + parseDurationMs(refreshTtl));
    await this.prisma.unscoped().refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthenticatedUser(user: {
    id: string;
    tenantId: string;
    officeId: string | null;
    name: string;
    email: string;
    role: UserRole;
  }): AuthenticatedUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      officeId: user.officeId,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  // exposed for tests
  static generateRefreshTokenRaw() {
    return randomBytes(32).toString('hex');
  }
}

function parseDurationMs(s: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(s.trim());
  if (!m) {
    const n = Number(s);
    if (!Number.isNaN(n)) return n;
    throw new Error(`Bad duration: ${s}`);
  }
  const n = Number(m[1]);
  const unit = m[2];
  const mul =
    unit === 's' ? 1_000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mul;
}
