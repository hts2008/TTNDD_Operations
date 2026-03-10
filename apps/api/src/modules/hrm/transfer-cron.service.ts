import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database';
import { HrmService } from './hrm.service';

/**
 * T-0062: Age-trigger cron — detects members who exceed branch age range
 * and automatically creates TransferCase records.
 *
 * Runs daily at 2:00 AM.
 */
@Injectable()
export class TransferCronService {
  private readonly logger = new Logger(TransferCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hrmService: HrmService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkAgeThresholdTransfers() {
    this.logger.log('Running age-threshold transfer check...');

    // Get all branches with age ranges defined
    const branches = await this.prisma.branch.findMany({
      select: { id: true, orgId: true, code: true, name: true, minAge: true, maxAge: true },
    });

    const branchesWithAgeRange = branches.filter((b) => b.maxAge != null);
    if (branchesWithAgeRange.length === 0) {
      this.logger.log('No branches with age ranges defined. Skipping.');
      return;
    }

    let transfersCreated = 0;

    for (const branch of branchesWithAgeRange) {
      // Find active members in this branch whose age exceeds maxAge
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - (branch.maxAge ?? 99));

      const overageMembers = await this.prisma.orgMember.findMany({
        where: {
          orgId: branch.orgId,
          branchId: branch.id,
          status: 'active',
          profile: {
            birthDate: { lte: cutoffDate },
          },
        },
        select: { id: true, orgId: true },
      });

      if (overageMembers.length === 0) continue;

      // Find the next branch (by minAge ascending, picking the one after current branch)
      const nextBranch = branches.find(
        (b) =>
          b.orgId === branch.orgId && b.id !== branch.id && (b.minAge ?? 0) >= (branch.maxAge ?? 0),
      );

      if (!nextBranch) {
        this.logger.warn(
          `No successor branch for "${branch.name}" (maxAge=${branch.maxAge}). Skipping ${overageMembers.length} members.`,
        );
        continue;
      }

      // Check for existing open transfer cases to avoid duplicates
      for (const member of overageMembers) {
        const existingCase = await this.prisma.transferCase.findFirst({
          where: {
            orgMemberId: member.id,
            status: { in: ['initiated', 'pending_handover', 'handover_complete', 'accepted'] },
          },
        });

        if (existingCase) continue;

        try {
          await this.hrmService.transferMember(
            member.orgId,
            member.id,
            {
              toBranchId: nextBranch.id,
              reason: `Age threshold exceeded (branch "${branch.name}" max age: ${branch.maxAge})`,
              triggerType: 'age_threshold',
            },
            'system', // system-initiated
          );
          transfersCreated++;
        } catch (error) {
          this.logger.error(`Failed to create transfer case for member ${member.id}: ${error}`);
        }
      }
    }

    this.logger.log(`Age-threshold check complete. Created ${transfersCreated} transfer cases.`);
  }
}
