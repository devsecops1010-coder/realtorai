import { Injectable, NestMiddleware } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';

/**
 * NestJS middleware wrapper around express's cookie-parser. We use this
 * instead of `app.use(cookieParser())` in main.ts because main.ts is
 * managed outside this code path; applying it via AppModule.configure()
 * keeps the wiring local to the auth module.
 */
@Injectable()
export class CookieParserMiddleware implements NestMiddleware {
  private readonly parse = cookieParser();

  use(req: Request, res: Response, next: NextFunction) {
    this.parse(req, res, next);
  }
}
