import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/**
 * T-0068: Compliance cron — checks for expiring background checks and
 * training certifications and publishes notification events.
 *
 * Runs daily at 6:00 AM.
 */
@Injectable()
export class ComplianceCronService {
  private readonly logger = new Logger(ComplianceCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkExpiringCompliance() {
    this.logger.log('Running compliance expiry check...');

    const now = new Date();
    const thresholds = [
      { days: 30, urgency: 'low' },
      { days: 14, urgency: 'medium' },
      { days: 7, urgency: 'high' },
    ];

    let totalAlerts = 0;

    // Get all active orgs
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const org of orgs) {
      for (const threshold of thresholds) {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() + threshold.days);
        const pastCutoff = new Date(now);
        pastCutoff.setDate(pastCutoff.getDate() + threshold.days - 1);

        // Check background check expiry
        const expiringChecks = await this.prisma.memberProfile.findMany({
          where: {
            orgId: org.id,
            backgroundCheckExpiry: { gte: pastCutoff, lte: cutoff },
          },
          select: { orgMemberId: true, backgroundCheckExpiry: true },
        });

        for (const check of expiringChecks) {
          await this.domainEvents.publish({
            orgId: org.id,
            eventType: 'compliance.background_check_expiring',
            aggregateId: check.orgMemberId,
            aggregateType: 'OrgMember',
            payload: {
              expiryDate: check.backgroundCheckExpiry,
              daysUntilExpiry: threshold.days,
              urgency: threshold.urgency,
            },
            actorUserId: 'system',
          });
          totalAlerts++;
        }

        // Check training record expiry
        const expiringTraining = await this.prisma.trainingRecord.findMany({
          where: {
            orgId: org.id,
            expiresAt: { gte: pastCutoff, lte: cutoff },
          },
          select: { orgMemberId: true, trainingType: true, trainingName: true, expiresAt: true },
        });

        for (const training of expiringTraining) {
          await this.domainEvents.publish({
            orgId: org.id,
            eventType: 'compliance.training_expiring',
            aggregateId: training.orgMemberId,
            aggregateType: 'OrgMember',
            payload: {
              trainingType: training.trainingType,
              trainingName: training.trainingName,
              expiryDate: training.expiresAt,
              daysUntilExpiry: threshold.days,
              urgency: threshold.urgency,
            },
            actorUserId: 'system',
          });
          totalAlerts++;
        }
      }
    }

    this.logger.log(`Compliance check complete. Published ${totalAlerts} expiry alerts.`);
  }
}
