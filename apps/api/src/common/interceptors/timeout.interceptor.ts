import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

/**
 * Global timeout interceptor.
 *
 * Applies a configurable request timeout (default 30s).
 * Configure via REQUEST_TIMEOUT_MS environment variable.
 *
 * Register globally in app.module.ts:
 *   { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor }
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.timeoutMs = this.config.get<number>('REQUEST_TIMEOUT_MS', 30_000);
  }

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          const request = _context.switchToHttp().getRequest();
          this.logger.warn(
            `Request timeout: ${request.method} ${request.url} exceeded ${this.timeoutMs}ms`,
          );
          return throwError(() => new RequestTimeoutException(
            `Request timed out after ${this.timeoutMs}ms`,
          ));
        }
        return throwError(() => err);
      }),
    );
  }
}
