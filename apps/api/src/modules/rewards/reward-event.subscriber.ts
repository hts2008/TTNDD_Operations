import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { ExpService } from './exp.service';

/**
 * Listens to domain events from other modules and awards EXP accordingly.
 * This is the event-driven integration point for the Reward Engine.
 *
 * V3 spec requirement: consume ALL domain events.
 * Current implementation: 12 events from HRM, Session, Scout, LMS, Projects, Enrichment.
 */
@Injectable()
export class RewardEventSubscriber {
  private readonly logger = new Logger(RewardEventSubscriber.name);

  constructor(private readonly expService: ExpService) {}

  // ── HRM Events ──

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

  // ── Session Events ──

  @OnEvent(DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED)
  async onAttendanceMarked(event: {
    orgId: string;
    payload: { memberId: string; sessionId: string };
  }) {
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

  @OnEvent(DOMAIN_EVENTS.SESSION.DEBRIEFED)
  async onSessionDebriefed(event: {
    orgId: string;
    payload: { memberId?: string; sessionId: string };
  }) {
    if (!event.payload.memberId) return;
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        3,
        DOMAIN_EVENTS.SESSION.DEBRIEFED,
        'session',
        event.payload.sessionId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award debrief EXP: ${(e as Error).message}`);
    }
  }

  // ── Scout Events ──

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

  // ── Event/Camp Events ──

  @OnEvent(DOMAIN_EVENTS.EVENT.CHECKED_IN)
  async onEventCheckedIn(event: { orgId: string; payload: { memberId: string; eventId: string } }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        10,
        DOMAIN_EVENTS.EVENT.CHECKED_IN,
        'event',
        event.payload.eventId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award check-in EXP: ${(e as Error).message}`);
    }
  }

  // ── LMS Events ──

  @OnEvent(DOMAIN_EVENTS.LMS.LESSON_COMPLETED)
  async onLessonCompleted(event: {
    orgId: string;
    payload: { memberId: string; lessonId: string };
  }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        5,
        DOMAIN_EVENTS.LMS.LESSON_COMPLETED,
        'lms',
        event.payload.lessonId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award lesson EXP: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.LMS.QUIZ_PASSED)
  async onQuizPassed(event: { orgId: string; payload: { memberId: string; quizId: string } }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        15,
        DOMAIN_EVENTS.LMS.QUIZ_PASSED,
        'lms',
        event.payload.quizId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award quiz EXP: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.LMS.COURSE_COMPLETED)
  async onCourseCompleted(event: {
    orgId: string;
    payload: { memberId: string; courseId: string };
  }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        30,
        DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
        'lms',
        event.payload.courseId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award course completion EXP: ${(e as Error).message}`);
    }
  }

  // ── Project Events ──

  @OnEvent(DOMAIN_EVENTS.PROJECT.TASK_COMPLETED)
  async onProjectTaskCompleted(event: {
    orgId: string;
    payload: { memberId: string; taskId: string };
  }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        5,
        DOMAIN_EVENTS.PROJECT.TASK_COMPLETED,
        'project',
        event.payload.taskId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award project task EXP: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.PROJECT.PROJECT_COMPLETED)
  async onProjectCompleted(event: {
    orgId: string;
    payload: { memberId: string; projectId: string };
  }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        25,
        DOMAIN_EVENTS.PROJECT.PROJECT_COMPLETED,
        'project',
        event.payload.projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award project completion EXP: ${(e as Error).message}`);
    }
  }

  // ── Enrichment Events ──

  @OnEvent(DOMAIN_EVENTS.ENRICHMENT.SPIRITUAL_LOG_CREATED)
  async onSpiritualLogCreated(event: {
    orgId: string;
    payload: { memberId: string; logId: string };
  }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        5,
        DOMAIN_EVENTS.ENRICHMENT.SPIRITUAL_LOG_CREATED,
        'enrichment',
        event.payload.logId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award spiritual log EXP: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.ENRICHMENT.NGU_GIOI_ASSESSED)
  async onNguGioiAssessed(event: {
    orgId: string;
    payload: { memberId: string; assessmentId: string };
  }) {
    try {
      await this.expService.awardExp(
        event.orgId,
        event.payload.memberId,
        10,
        DOMAIN_EVENTS.ENRICHMENT.NGU_GIOI_ASSESSED,
        'enrichment',
        event.payload.assessmentId,
      );
    } catch (e) {
      this.logger.warn(`Failed to award Ngũ Giới assessment EXP: ${(e as Error).message}`);
    }
  }
}
