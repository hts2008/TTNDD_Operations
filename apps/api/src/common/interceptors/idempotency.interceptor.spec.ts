import { ConflictException } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { of } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  const createContext = (method: string, key?: string) => {
    const headers: Record<string, string> = {};
    if (key) headers['idempotency-key'] = key;

    let statusCode = 200;
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, headers }),
        getResponse: () => ({
          get statusCode() { return statusCode; },
          status: (code: number) => { statusCode = code; },
        }),
      }),
    } as any;
  };

  const createHandler = (response: unknown = { ok: true }) => ({
    handle: () => of(response),
  });

  beforeEach(() => {
    interceptor = new IdempotencyInterceptor();
  });

  it('should pass through requests without idempotency key', (done) => {
    const ctx = createContext('POST');
    interceptor.intercept(ctx, createHandler()).subscribe((result) => {
      expect(result).toEqual({ ok: true });
      done();
    });
  });

  it('should pass through GET requests even with key', (done) => {
    const ctx = createContext('GET', 'key-1');
    interceptor.intercept(ctx, createHandler()).subscribe((result) => {
      expect(result).toEqual({ ok: true });
      done();
    });
  });

  it('should cache and replay response for same key', (done) => {
    const key = 'test-key-1';
    const ctx1 = createContext('POST', key);
    const handler = createHandler({ id: 'created-1' });

    interceptor.intercept(ctx1, handler).subscribe(() => {
      const ctx2 = createContext('POST', key);
      const newHandler = createHandler({ id: 'should-not-be-called' });

      interceptor.intercept(ctx2, newHandler).subscribe((result) => {
        expect(result).toEqual({ id: 'created-1' });
        done();
      });
    });
  });

  it('should allow different keys independently', (done) => {
    const ctx1 = createContext('POST', 'key-a');
    const ctx2 = createContext('POST', 'key-b');

    interceptor.intercept(ctx1, createHandler({ a: 1 })).subscribe(() => {
      interceptor.intercept(ctx2, createHandler({ b: 2 })).subscribe((result) => {
        expect(result).toEqual({ b: 2 });
        done();
      });
    });
  });
});
