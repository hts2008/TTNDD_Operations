import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { ExpService } from './exp.service';

/**
 * Listens to domain events from other modules and awards EXP accordingly.
 * This is the event-driven integration point for the Reward Engine.
 */
@Injectable()
export class RewardEventSubscriber {
  private readonly logger = new Logger(RewardEventSubscriber.name);

  constructor(private readonly expService: ExpService) {}

  @OnEvent(DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED)
  async onMemberActivated(event: { orgId: string; aggregateId: string }) {
    this.logger.debug(`Member activated: ${event.aggregateId} — awarding welcome EXP`);
    try {
      await this.expService.awardExp(
        event.orgId,
        event.aggregateId,
        10,
        DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED,
        'hrm',
      );
    } catch (e) {
      this.logger.warn(`Failed to award activation EXP: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED)
  async onAttendanceMarked(event: { orgId: string; payload: { memberId: string; sessionId: string } }) {
    this.logger.debug(`Attendance marked for: ${event.payload.memberId}`);
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        5,
        DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED,
        'session',
        event.payload.sessionId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award attendance EXP: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED)
  async onSkillVerified(event: { orgId: string; payload: { memberId: string; skillId: string } }) {
    this.logger.debug(`Skill verified for: ${event.payload.memberId}`);
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        20,
        DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED,
        'scout',
        event.payload.skillId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award skill EXP: ${(e as Error).message}`);
    }
  }
}
