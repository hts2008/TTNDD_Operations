import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';

const HEADER_NAME = 'idempotency-key';
const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  response: unknown;
  status: number;
  expiresAt: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly pending = new Set<string>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers[HEADER_NAME] as string | undefined;

    if (!key) {
      return next.handle();
    }

    if (request.method === 'GET') {
      return next.handle();
    }

    this.evictExpired();

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      const response = context.switchToHttp().getResponse();
      response.status(cached.status);
      return of(cached.response);
    }

    if (this.pending.has(key)) {
      throw new ConflictException(
        'A request with this idempotency key is already being processed',
      );
    }

    this.pending.add(key);

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const response = context.switchToHttp().getResponse();
          this.cache.set(key, {
            response: responseBody,
            status: response.statusCode,
            expiresAt: Date.now() + TTL_MS,
          });
          this.pending.delete(key);
        },
        error: () => {
          this.pending.delete(key);
        },
      }),
    );
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
