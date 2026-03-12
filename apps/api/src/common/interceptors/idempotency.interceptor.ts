import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../core/cache/cache.service';

/**
 * Idempotency interceptor for POST/PUT/PATCH mutations.
 *
 * Clients send an `Idempotency-Key` header. If the same key is seen
 * within the TTL window, the cached response is returned instead of
 * re-executing the handler.
 *
 * Usage (global or per-controller):
 *   @UseInterceptors(IdempotencyInterceptor)
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private static readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly cache: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const { method } = request;

    // Only apply to mutation methods
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

    // No key → proceed normally
    if (!idempotencyKey) {
      return next.handle();
    }

    const cacheKey = `idem:${method}:${request.url}:${idempotencyKey}`;
    const cached = await this.cache.get(cacheKey);

    if (cached !== null) {
      this.logger.debug(`Idempotency HIT: ${cacheKey}`);
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cache.set(
          cacheKey,
          response,
          IdempotencyInterceptor.TTL_MS,
        );
        this.logger.debug(`Idempotency STORED: ${cacheKey}`);
      }),
    );
  }
}
