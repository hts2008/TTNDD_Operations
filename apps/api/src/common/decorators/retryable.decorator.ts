import { Logger } from '@nestjs/common';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  retryable?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  jitter: true,
  retryable: () => true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, opts: Required<RetryOptions>): number {
  const exponential = opts.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, opts.maxDelayMs);

  if (!opts.jitter) return capped;

  return capped * (0.5 + Math.random() * 0.5);
}

export function Retryable(options?: RetryOptions): MethodDecorator {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger('Retryable');

  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          if (attempt === opts.maxRetries || !opts.retryable(lastError)) {
            throw lastError;
          }

          const delay = computeDelay(attempt, opts);
          logger.warn(
            `${String(propertyKey)} attempt ${attempt + 1}/${opts.maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms`,
          );

          await sleep(delay);
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
