import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, type AuthTokens } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import type { Env } from '../config/env.schema';
import { Public } from '../common/decorators/public.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

const ACCESS_COOKIE = 'rai_access';
const REFRESH_COOKIE = 'rai_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  @Audit('tenant.create', { targetType: 'tenant' })
  async register(@Body() dto: RegisterTenantDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.registerTenant(dto);
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.login', { targetType: 'user' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Accept refresh token either from body (backwards-compat for existing
    // localStorage clients) or from the httpOnly rai_refresh cookie.
    const token = dto.refreshToken || (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    if (!token) {
      return { error: 'refresh_token_missing' };
    }
    const tokens = await this.auth.refresh(token);
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.logout')
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.sub);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.sub);
  }

  // ---------- helpers ----------

  private setAuthCookies(res: Response, tokens: AuthTokens) {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const baseOpts = {
      httpOnly: true,
      // `secure` true only in prod — local dev over plain HTTP wouldn't get the cookie otherwise.
      secure: isProd,
      sameSite: isProd ? ('lax' as const) : ('lax' as const),
      path: '/',
    };
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...baseOpts,
      maxAge: parseTtlMs(tokens.expiresIn),
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOpts,
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }
}

function parseTtlMs(s: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(s.trim());
  if (!m) return 15 * 60_000;
  const n = Number(m[1]);
  const unit = m[2];
  const mul = unit === 's' ? 1_000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mul;
}
