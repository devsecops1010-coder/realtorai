import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { Env } from '../config/env.schema';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const ACCESS_COOKIE = 'rai_access';

/** Extract JWT from the rai_access httpOnly cookie, if present. */
function fromCookie(req: Request): string | null {
  const cookies = req?.cookies as Record<string, string> | undefined;
  return cookies?.[ACCESS_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<Env, true>) {
    super({
      // Accept either the Authorization: Bearer ... header (existing flow)
      // or the httpOnly rai_access cookie (new XSS-resistant flow).
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Wrong token type');
    }
    return payload;
  }
}
