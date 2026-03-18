import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get live leaderboard with scope filtering.
   * scope: 'org' | 'branch' | 'unit'
   */
  async getLive(orgId: string, scope: string = 'org', scopeId?: string, limit: number = 20) {
    const where: Record<string, unknown> = { orgId };

    if (scope === 'branch' && scopeId) {
      where.orgMember = { branchId: scopeId };
    } else if (scope === 'unit' && scopeId) {
      where.orgMember = { unitId: scopeId };
    }

    return this.prisma.memberExpSummary.findMany({
      where,
      include: {
        orgMember: {
          select: {
            scoutName: true,
            heroName: true,
            memberCode: true,
            user: { select: { displayName: true, avatarUrl: true } },
            branch: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { totalExp: 'desc' },
      take: limit,
    });
  }

  /**
   * Take a snapshot of the current leaderboard for historical tracking.
   */
  async takeSnapshot(
    orgId: string,
    scope: string = 'org',
    scopeId?: string,
    period: string = 'weekly',
  ) {
    const rankings = await this.getLive(orgId, scope, scopeId, 100);

    const snapshot = await this.prisma.leaderboardSnapshot.create({
      data: {
        orgId,
        scope,
        scopeId: scopeId || null,
        period,
        snapshotDate: new Date(),
        rankings: rankings.map((r, idx) => ({
          rank: idx + 1,
          memberId: r.orgMemberId,
          totalExp: r.totalExp,
          memberName: r.orgMember?.scoutName || r.orgMember?.heroName || 'Unknown',
        })),
      },
    });

    this.logger.debug(`Leaderboard snapshot taken: ${scope}/${scopeId || 'all'} (${period})`);
    return snapshot;
  }

  /**
   * Get historical snapshot list.
   */
  async getSnapshots(
    orgId: string,
    scope: string = 'org',
    period?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: Record<string, unknown> = { orgId, scope };
    if (period) where.period = period;

    const [data, total] = await Promise.all([
      this.prisma.leaderboardSnapshot.findMany({
        where,
        orderBy: { snapshotDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leaderboardSnapshot.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }
}
