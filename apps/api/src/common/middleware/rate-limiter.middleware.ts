import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const store = new Map<string, { count: number; resetAt: number }>();
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 100;

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.RATE_LIMIT_DISABLED === 'true' && !isProductionRuntime()) {
      return next();
    }

    const windowMs = toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
    const maxRequests = toPositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    next();
  }
}
