import { Retryable } from './retryable.decorator';

class TestService {
  callCount = 0;

  @Retryable({ maxRetries: 3, baseDelayMs: 10, jitter: false })
  async succeedOnThirdAttempt(): Promise<string> {
    this.callCount++;
    if (this.callCount < 3) throw new Error('transient failure');
    return 'success';
  }

  @Retryable({ maxRetries: 2, baseDelayMs: 10, jitter: false })
  async alwaysFail(): Promise<string> {
    this.callCount++;
    throw new Error('permanent failure');
  }

  @Retryable({ maxRetries: 3, baseDelayMs: 10, retryable: (e) => e.message !== 'fatal' })
  async nonRetryable(): Promise<string> {
    this.callCount++;
    throw new Error('fatal');
  }

  @Retryable({ maxRetries: 0 })
  async noRetries(): Promise<string> {
    this.callCount++;
    throw new Error('fail');
  }
}

describe('Retryable', () => {
  let svc: TestService;

  beforeEach(() => {
    svc = new TestService();
  });

  it('should succeed after retries', async () => {
    const result = await svc.succeedOnThirdAttempt();
    expect(result).toBe('success');
    expect(svc.callCount).toBe(3);
  });

  it('should throw after max retries exhausted', async () => {
    await expect(svc.alwaysFail()).rejects.toThrow('permanent failure');
    expect(svc.callCount).toBe(3);
  });

  it('should not retry non-retryable errors', async () => {
    await expect(svc.nonRetryable()).rejects.toThrow('fatal');
    expect(svc.callCount).toBe(1);
  });

  it('should throw immediately when maxRetries is 0', async () => {
    await expect(svc.noRetries()).rejects.toThrow('fail');
    expect(svc.callCount).toBe(1);
  });
});
