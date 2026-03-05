import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 2-layer caching strategy (from TECH_STACK.md Section 9):
 * L1: In-process LRU (node-cache pattern, instant, <1ms)
 * L2: Redis (future — connected via REDIS_URL)
 *
 * For Phase 0, only L1 is implemented. L2 Redis will be added in Phase 1.
 */
@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private readonly l1 = new Map<string, CacheEntry<unknown>>();
  private readonly maxL1Size: number;
  private readonly defaultTtlMs: number;

  constructor(private readonly config: ConfigService) {
    this.maxL1Size = 1000;
    this.defaultTtlMs = 5 * 60 * 1000; // 5 minutes
  }

  onModuleInit() {
    this.logger.log(`Cache initialized (L1 in-memory, max=${this.maxL1Size})`);
    const redisUrl = this.config.get('REDIS_URL');
    if (redisUrl) {
      this.logger.log('Redis URL configured — L2 cache will be enabled in Phase 1');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.l1.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.l1.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.l1.size >= this.maxL1Size) {
      const firstKey = this.l1.keys().next().value;
      if (firstKey) this.l1.delete(firstKey);
    }

    this.l1.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  async del(key: string): Promise<void> {
    this.l1.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;
    for (const key of this.l1.keys()) {
      if (key.startsWith(pattern)) {
        this.l1.delete(key);
        count++;
      }
    }
    return count;
  }
}
