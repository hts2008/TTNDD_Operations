import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';

@Injectable()
export class CapCounterService {
  private readonly logger = new Logger(CapCounterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a member can receive EXP for a given event type,
   * respecting daily and weekly caps from ExpConfig.
   */
  async canAward(
    orgId: string,
    memberId: string,
    eventType: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const config = await this.prisma.expConfig.findUnique({
      where: { orgId_eventType: { orgId, eventType } },
    });

    // No config found → allow (unconfigured events have no cap)
    if (!config) return { allowed: true };

    // Check daily cap
    if (config.maxPerDay !== -1) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const dailyCount = await this.prisma.expTransaction.count({
        where: {
          orgId,
          orgMemberId: memberId,
          eventType,
          transactionType: 'earn',
          createdAt: { gte: startOfDay },
        },
      });

      if (dailyCount >= config.maxPerDay) {
        this.logger.debug(
          `Daily cap reached for member ${memberId}, event ${eventType}: ${dailyCount}/${config.maxPerDay}`,
        );
        return {
          allowed: false,
          reason: `Daily cap reached (${dailyCount}/${config.maxPerDay}) for ${eventType}`,
        };
      }
    }

    // Check weekly cap
    if (config.maxPerWeek !== -1) {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyCount = await this.prisma.expTransaction.count({
        where: {
          orgId,
          orgMemberId: memberId,
          eventType,
          transactionType: 'earn',
          createdAt: { gte: startOfWeek },
        },
      });

      if (weeklyCount >= config.maxPerWeek) {
        this.logger.debug(
          `Weekly cap reached for member ${memberId}, event ${eventType}: ${weeklyCount}/${config.maxPerWeek}`,
        );
        return {
          allowed: false,
          reason: `Weekly cap reached (${weeklyCount}/${config.maxPerWeek}) for ${eventType}`,
        };
      }
    }

    return { allowed: true };
  }
}
