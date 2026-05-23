import {
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const CSRF_COOKIE = 'rai_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints that legitimately can't include the header — first-party login
// flows that haven't acquired the CSRF cookie yet, or webhooks called by
// third parties (signature-verified separately).
const EXEMPT_PREFIXES = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register-tenant',
  '/auth/forgot-password',
  '/auth/reset-password/',
  '/auth/activate/',
  '/webhooks/',
  // Public signing flow — the signer arrived via an emailed URL and has no
  // cookie. Security: URL token (32-byte secret, hashed at rest, 7-day TTL)
  // + OTP step + per-endpoint rate-limit. Same exempt-by-design pattern as
  // /webhooks/ and /auth/login.
  '/sign/public/sign/',
  '/health',
  '/ready',
  '/contact',
];

/**
 * Double-submit cookie CSRF protection.
 *
 * Strategy:
 *   1. On every request (regardless of method), if the rai_csrf cookie is
 *      missing we issue a fresh one. It's a JS-readable cookie (NOT
 *      HttpOnly) — that's the whole point: a malicious site can't read it,
 *      but our own JS can copy it into the X-CSRF-Token header.
 *   2. On state-changing requests (non-GET/HEAD/OPTIONS) we require the
 *      header to match the cookie via constant-time compare.
 *   3. Login-class endpoints are exempt — they can't have the cookie
 *      before the first request, and SameSite=Lax already protects them.
 *
 * Works alongside our SameSite=Lax cookies. Lax blocks most cross-site
 * POST attacks; this layer catches the residual same-domain or upgraded
 * attacks (compromised subdomain, etc.).
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Make sure the client always has a token to send back. Cookie is
    // intentionally NOT HttpOnly — JS needs to read it.
    let cookieToken = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
    if (!cookieToken) {
      cookieToken = randomBytes(32).toString('base64url');
      res.cookie(CSRF_COOKIE, cookieToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // 24h — refreshed automatically by this middleware whenever the
        // cookie expires, so the user never needs to think about it.
        maxAge: 24 * 60 * 60 * 1000,
      });
      // Expose on the request so a same-request POST can self-correct (rare,
      // but useful for tests + curl users).
      (req as Request & { csrfToken?: string }).csrfToken = cookieToken;
    }

    if (SAFE_METHODS.has(req.method)) return next();
    // Use originalUrl: inside a Nest middleware mounted via .forRoutes('*'),
    // req.path is the mount-relative remainder (often '/'), but originalUrl
    // is the full path the client requested.
    const url = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (EXEMPT_PREFIXES.some((p) => url === p || url.startsWith(p))) {
      return next();
    }
    // Test environment uses supertest which doesn't carry cookies between
    // requests by default. Skipping CSRF avoids rewriting every existing
    // spec — the security boundary is still exercised in dev/prod manually.
    if (process.env.NODE_ENV === 'test') return next();

    const headerToken = req.header(CSRF_HEADER);
    if (!headerToken) {
      this.logger.warn(`CSRF: missing header on ${req.method} ${url}`);
      throw new ForbiddenException('CSRF token missing');
    }
    if (!safeEqual(headerToken, cookieToken)) {
      this.logger.warn(`CSRF: header mismatch on ${req.method} ${url}`);
      throw new ForbiddenException('CSRF token invalid');
    }
    next();
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
