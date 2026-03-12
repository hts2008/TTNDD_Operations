import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../core/cache/cache.service';

export const CACHE_TTL_KEY = 'cache_ttl';

/**
 * Decorator to set cache TTL on a controller method.
 *
 * Usage:
 *   @CacheTTL(60)             // cache 60 seconds
 *   @Get('members')
 *   findAll() { ... }
 */
export const CacheTTL = (seconds: number) =>
  SetMetadata(CACHE_TTL_KEY, seconds);

/**
 * HTTP-level cache interceptor for GET requests.
 *
 * Uses the existing CacheService (L1 in-memory) to cache responses.
 * Only caches GET requests; mutations bypass cache.
 *
 * Apply per-controller or globally:
 *   @UseInterceptors(HttpCacheInterceptor)
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check for @CacheTTL decorator
    const ttlSeconds = this.reflector.get<number>(
      CACHE_TTL_KEY,
      context.getHandler(),
    );

    // No @CacheTTL → skip caching
    if (!ttlSeconds) {
      return next.handle();
    }

    const cacheKey = `http:${request.url}`;
    const cached = await this.cache.get(cacheKey);

    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cache.set(cacheKey, response, ttlSeconds * 1000);
        this.logger.debug(`Cache SET: ${cacheKey} (TTL=${ttlSeconds}s)`);
      }),
    );
  }
}
