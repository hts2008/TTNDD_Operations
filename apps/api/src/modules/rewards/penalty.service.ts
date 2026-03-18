import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { ExpService } from './exp.service';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class PenaltyService {
  private readonly logger = new Logger(PenaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly expService: ExpService,
  ) {}

  /**
   * Apply a penalty (deduct EXP) with optional correction task.
   */
  async applyPenalty(
    orgId: string,
    memberId: string,
    amount: number,
    reason: string,
    recordedBy: string,
    deductionItem?: string,
    correctionTask?: string,
  ) {
    // Use existing deduct logic for balance check + transaction creation
    const tx = await this.expService.deductExp(orgId, memberId, amount, reason, recordedBy);

    // Update the created transaction with penalty-specific fields
    if (deductionItem || correctionTask) {
      await this.prisma.expTransaction.update({
        where: { id: tx.id },
        data: { deductionItem, correctionTask },
      });
    }

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.REWARDS.PENALTY_APPLIED,
      aggregateId: memberId,
      aggregateType: 'OrgMember',
      payload: { amount, reason, deductionItem, correctionTask, transactionId: tx.id },
      actorUserId: recordedBy,
    });

    this.logger.debug(`Penalty applied: -${amount} EXP for member ${memberId}, reason: ${reason}`);
    return tx;
  }

  /**
   * Correct (reverse) a previously applied penalty.
   * Creates a new 'earn' transaction for the reversed amount and marks original as corrected.
   */
  async correctPenalty(orgId: string, penaltyTxId: string, correctedBy: string) {
    const penaltyTx = await this.prisma.expTransaction.findFirst({
      where: { id: penaltyTxId, orgId, transactionType: 'deduct' },
    });

    if (!penaltyTx) {
      throw new NotFoundException('Penalty transaction not found');
    }

    if (penaltyTx.isCorrected) {
      throw new BadRequestException('This penalty has already been corrected');
    }

    const reversalAmount = Math.abs(penaltyTx.expAmount);

    // Award back the deducted EXP
    await this.expService.awardExp(
      orgId,
      penaltyTx.orgMemberId,
      reversalAmount,
      'penalty_correction',
      'rewards',
      penaltyTxId,
      correctedBy,
      `Correction of penalty: ${penaltyTx.deductionReason}`,
    );

    // Mark original as corrected
    await this.prisma.expTransaction.update({
      where: { id: penaltyTxId },
      data: {
        isCorrected: true,
        correctedAt: new Date(),
        correctedBy,
      },
    });

    // Decrement penalty count on summary
    await this.prisma.memberExpSummary.update({
      where: { orgMemberId: penaltyTx.orgMemberId },
      data: { penaltyCount: { decrement: 1 } },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.REWARDS.PENALTY_CORRECTED,
      aggregateId: penaltyTx.orgMemberId,
      aggregateType: 'OrgMember',
      payload: { penaltyTxId, reversedAmount: reversalAmount },
      actorUserId: correctedBy,
    });

    this.logger.debug(
      `Penalty corrected: +${reversalAmount} EXP restored for member ${penaltyTx.orgMemberId}`,
    );
    return { corrected: true, reversedAmount: reversalAmount };
  }
}
