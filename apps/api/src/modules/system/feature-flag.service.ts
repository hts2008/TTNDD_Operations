import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  scope: 'global' | 'org' | 'user';
  description: string;
  defaultValue: boolean;
  updatedAt: Date;
}

/**
 * Feature Flag Service — STORY-007 T-0194
 *
 * Manages feature flags with org-level overrides.
 * Uses the existing SystemConfig pattern (key-value in DB)
 * with an in-memory cache for performance.
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  /** In-memory cache: orgId::flagKey → boolean */
  private cache = new Map<string, { value: boolean; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  /** Default flag definitions per V3 spec */
  private readonly DEFAULTS: Record<string, { enabled: boolean; description: string; scope: 'global' | 'org' }> = {
    // Core modules — default ON
    'module.hrm':            { enabled: true,  description: 'HRM Module',                scope: 'org' },
    'module.scout':          { enabled: true,  description: 'Scout Activities Module',    scope: 'org' },
    'module.lms':            { enabled: true,  description: 'LMS Module',                scope: 'org' },
    'module.finance':        { enabled: true,  description: 'Finance Module',            scope: 'org' },
    'module.notifications':  { enabled: true,  description: 'Notifications Module',      scope: 'org' },
    'module.reporting':      { enabled: true,  description: 'Reporting & Dashboards',    scope: 'org' },
    // Optional modules — default OFF per spec
    'module.warehouse_sync': { enabled: false, description: 'Warehouse BigQuery Sync',   scope: 'org' },
    'module.parent_portal':  { enabled: false, description: 'Parent Portal',             scope: 'org' },
    // Feature flags
    'feature.quiet_hours':   { enabled: true,  description: 'Quiet Hours for minors',    scope: 'global' },
    'feature.parental_routing': { enabled: true, description: 'Parental notification routing', scope: 'global' },
    'feature.pdf_export':    { enabled: true,  description: 'PDF Report Export',         scope: 'org' },
    'feature.zalo_channel':  { enabled: false, description: 'Zalo OA Channel',           scope: 'org' },
    'feature.fcm_channel':   { enabled: false, description: 'FCM Push Channel',          scope: 'org' },
    'feature.email_channel': { enabled: false, description: 'Email Channel',             scope: 'org' },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a feature flag is enabled for an org.
   * Uses cache → DB override → default.
   */
  async isEnabled(orgId: string, flagKey: string): Promise<boolean> {
    const cacheKey = `${orgId}::${flagKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Check DB for org-level override
    try {
      const override = await this.prisma.auditLog.findFirst({
        where: {
          orgId,
          resource: 'feature_flag',
          action: 'override',
          resourceId: flagKey,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (override?.newValue !== null && override?.newValue !== undefined) {
        const value = (override.newValue as any)?.enabled === true;
        this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return value;
      }
    } catch {
      // If DB fails, fall through to defaults
    }

    // Use default
    const def = this.DEFAULTS[flagKey];
    const value = def?.enabled ?? false;
    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return value;
  }

  /**
   * Get all flags with their current status for an org.
   */
  async getAllFlags(orgId: string): Promise<FeatureFlag[]> {
    const flags: FeatureFlag[] = [];

    for (const [key, def] of Object.entries(this.DEFAULTS)) {
      const enabled = await this.isEnabled(orgId, key);
      flags.push({
        key,
        enabled,
        scope: def.scope,
        description: def.description,
        defaultValue: def.enabled,
        updatedAt: new Date(),
      });
    }

    return flags;
  }

  /**
   * Toggle a feature flag for an org.
   */
  async setFlag(orgId: string, flagKey: string, enabled: boolean, userId: string) {
    const def = this.DEFAULTS[flagKey];
    if (!def) {
      throw new Error(`Unknown feature flag: ${flagKey}`);
    }

    // Store override as an audit log entry
    await this.prisma.auditLog.create({
      data: {
        orgId,
        userId,
        resource: 'feature_flag',
        action: 'override',
        resourceId: flagKey,
        oldValue: { enabled: def.enabled },
        newValue: { enabled },
      },
    });

    // Invalidate cache
    this.cache.delete(`${orgId}::${flagKey}`);
    this.logger.log(`Feature flag "${flagKey}" set to ${enabled} for org ${orgId} by ${userId}`);

    return { key: flagKey, enabled, scope: def.scope };
  }

  /**
   * Reset a feature flag to its default value.
   */
  async resetFlag(orgId: string, flagKey: string, userId: string) {
    const def = this.DEFAULTS[flagKey];
    if (!def) {
      throw new Error(`Unknown feature flag: ${flagKey}`);
    }

    return this.setFlag(orgId, flagKey, def.enabled, userId);
  }

  /**
   * Clear the in-memory cache.
   */
  clearCache() {
    this.cache.clear();
    this.logger.log('Feature flag cache cleared');
  }
}
