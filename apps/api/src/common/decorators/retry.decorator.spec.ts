import { Retryable } from './retry.decorator';

/**
 * Unit tests for @Retryable decorator.
 */
describe('Retryable decorator', () => {
  class TestService {
    callCount = 0;

    @Retryable(3, 50) // 3 attempts, 50ms base delay (fast for tests)
    async alwaysSucceeds(): Promise<string> {
      this.callCount++;
      return 'ok';
    }

    @Retryable(3, 50)
    async failsThenSucceeds(): Promise<string> {
      this.callCount++;
      if (this.callCount < 3) {
        throw new Error(`Attempt ${this.callCount} failed`);
      }
      return 'recovered';
    }

    @Retryable(3, 50)
    async alwaysFails(): Promise<string> {
      this.callCount++;
      throw new Error('permanent failure');
    }

    @Retryable(2, 50)
    async customMax(): Promise<string> {
      this.callCount++;
      throw new Error('fail');
    }
  }

  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  it('should succeed on first attempt without retries', async () => {
    const result = await service.alwaysSucceeds();
    expect(result).toBe('ok');
    expect(service.callCount).toBe(1);
  });

  it('should retry and eventually succeed', async () => {
    const result = await service.failsThenSucceeds();
    expect(result).toBe('recovered');
    expect(service.callCount).toBe(3);
  });

  it('should throw after all retries exhausted', async () => {
    await expect(service.alwaysFails()).rejects.toThrow('permanent failure');
    expect(service.callCount).toBe(3);
  });

  it('should respect custom maxAttempts', async () => {
    await expect(service.customMax()).rejects.toThrow('fail');
    expect(service.callCount).toBe(2);
  });

  it('should add backoff delay between retries', async () => {
    const start = Date.now();
    try {
      await service.alwaysFails();
    } catch {
      // expected
    }
    const elapsed = Date.now() - start;
    // With base=50ms, 3 attempts should take at least ~100ms of delay
    // (50ms after attempt 1 + 100ms after attempt 2 = 150ms minimum base)
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });
});
