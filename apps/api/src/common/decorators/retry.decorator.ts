import { Logger } from '@nestjs/common';

/**
 * @Retryable decorator — retries a method on failure with exponential backoff + jitter.
 *
 * Usage:
 *   @Retryable(3, 200)
 *   async sendNotification(data: NotifDto) { ... }
 *
 * @param maxAttempts  Maximum retry attempts (default: 3)
 * @param baseDelayMs  Base delay in ms before first retry (default: 200)
 */
export function Retryable(maxAttempts = 3, baseDelayMs = 200) {
  const logger = new Logger('Retryable');

  return function (
    _target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>,
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt === maxAttempts) {
            logger.error(
              `${propertyKey}: Failed after ${maxAttempts} attempts — ${lastError.message}`,
            );
            throw lastError;
          }

          // Exponential backoff with jitter: delay * 2^(attempt-1) + random(0..delay)
          const delay =
            baseDelayMs * Math.pow(2, attempt - 1) +
            Math.random() * baseDelayMs;

          logger.warn(
            `${propertyKey}: Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
