import { HttpException } from '@nestjs/common';
import { RateLimiterMiddleware } from './rate-limiter.middleware';

function makeReq(ip: string) {
  return { ip, socket: { remoteAddress: ip } } as any;
}

describe('RateLimiterMiddleware', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('uses RATE_LIMIT_MAX_REQUESTS for local smoke limits', () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    const middleware = new RateLimiterMiddleware();
    const next = jest.fn();
    const req = makeReq('rate-limit-test-1');

    middleware.use(req, {} as any, next);
    middleware.use(req, {} as any, next);

    expect(() => middleware.use(req, {} as any, next)).toThrow(HttpException);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('can be disabled outside production for deterministic E2E smoke', () => {
    process.env.APP_ENV = 'test';
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1';
    const middleware = new RateLimiterMiddleware();
    const next = jest.fn();
    const req = makeReq('rate-limit-test-2');

    middleware.use(req, {} as any, next);
    middleware.use(req, {} as any, next);
    middleware.use(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(3);
  });

  it('does not honor RATE_LIMIT_DISABLED in production', () => {
    process.env.APP_ENV = 'production';
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1';
    const middleware = new RateLimiterMiddleware();
    const next = jest.fn();
    const req = makeReq('rate-limit-test-3');

    middleware.use(req, {} as any, next);

    expect(() => middleware.use(req, {} as any, next)).toThrow(HttpException);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
