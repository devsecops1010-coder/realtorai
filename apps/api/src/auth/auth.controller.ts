import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  @Audit('tenant.create', { targetType: 'tenant' })
  register(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.login', { targetType: 'user' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.logout')
  async logout(@CurrentUser() user: JwtPayload) {
    await this.auth.logout(user.sub);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.sub);
  }
}
