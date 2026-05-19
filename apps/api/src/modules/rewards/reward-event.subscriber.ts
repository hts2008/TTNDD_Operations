import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { PrismaService } from '../../core/database';
import { RewardAutomationService } from './reward-automation.service';

type RewardDomainEvent = {
  id?: string;
  orgId: string;
  aggregateId?: string;
  actorUserId?: string;
  payload?: Record<string, unknown>;
};

@Injectable()
export class RewardEventSubscriber {
  private readonly logger = new Logger(RewardEventSubscriber.name);

  constructor(
    private readonly rewards: RewardAutomationService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED)
  async onMemberActivated(event: RewardDomainEvent) {
    const memberId = event.aggregateId;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED,
      memberId,
      defaultExp: 10,
      sourceModule: 'hrm',
      sourceEntityId: memberId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED)
  async onAttendanceMarked(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const sessionId = event.payload?.sessionId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.SESSION.ATTENDANCE_MARKED,
      memberId,
      defaultExp: 5,
      sourceModule: 'session',
      sourceEntityId: sessionId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.SESSION.DEBRIEFED)
  async onSessionDebriefed(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const sessionId = event.payload?.sessionId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.SESSION.DEBRIEFED,
      memberId,
      defaultExp: 3,
      sourceModule: 'session',
      sourceEntityId: sessionId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED)
  async onSkillVerified(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const skillId = event.payload?.skillId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.SCOUT.SKILL_VERIFIED,
      memberId,
      defaultExp: 20,
      sourceModule: 'scout',
      sourceEntityId: skillId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.EVENT.CHECKED_IN)
  async onEventCheckedIn(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const eventId = event.payload?.eventId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.EVENT.CHECKED_IN,
      memberId,
      defaultExp: 10,
      sourceModule: 'event',
      sourceEntityId: eventId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.LMS.LESSON_COMPLETED)
  async onLessonCompleted(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const lessonId = event.payload?.lessonId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.LMS.LESSON_COMPLETED,
      memberId,
      defaultExp: 5,
      sourceModule: 'lms',
      sourceEntityId: lessonId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.LMS.QUIZ_PASSED)
  async onQuizPassed(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const quizId = event.payload?.quizId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.LMS.QUIZ_PASSED,
      memberId,
      defaultExp: 15,
      sourceModule: 'lms',
      sourceEntityId: quizId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.LMS.COURSE_COMPLETED)
  async onCourseCompleted(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const courseId = event.payload?.courseId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
      memberId,
      defaultExp: 30,
      sourceModule: 'lms',
      sourceEntityId: courseId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.PROJECT.TASK_COMPLETED)
  async onProjectTaskCompleted(event: RewardDomainEvent) {
    const taskId = (event.payload?.taskId as string | undefined) ?? event.aggregateId;
    const expEarned = typeof event.payload?.expEarned === 'number' ? event.payload.expEarned : 5;
    const memberIds = await this.resolveProjectTaskRecipients(event);
    for (const memberId of memberIds) {
      await this.process({
        event,
        eventType: DOMAIN_EVENTS.PROJECT.TASK_COMPLETED,
        memberId,
        defaultExp: expEarned,
        sourceModule: 'project',
        sourceEntityId: taskId,
      });
    }
  }

  @OnEvent(DOMAIN_EVENTS.PROJECT.PROJECT_COMPLETED)
  async onProjectCompleted(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const projectId = event.payload?.projectId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.PROJECT.PROJECT_COMPLETED,
      memberId,
      defaultExp: 25,
      sourceModule: 'project',
      sourceEntityId: projectId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.ENRICHMENT.SPIRITUAL_LOG_CREATED)
  async onSpiritualLogCreated(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const logId = event.payload?.logId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.ENRICHMENT.SPIRITUAL_LOG_CREATED,
      memberId,
      defaultExp: 5,
      sourceModule: 'enrichment',
      sourceEntityId: logId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.ENRICHMENT.NGU_GIOI_ASSESSED)
  async onNguGioiAssessed(event: RewardDomainEvent) {
    const memberId = event.payload?.memberId as string | undefined;
    const assessmentId = event.payload?.assessmentId as string | undefined;
    if (!memberId) return;
    await this.process({
      event,
      eventType: DOMAIN_EVENTS.ENRICHMENT.NGU_GIOI_ASSESSED,
      memberId,
      defaultExp: 10,
      sourceModule: 'enrichment',
      sourceEntityId: assessmentId,
    });
  }

  private async process(input: {
    event: RewardDomainEvent;
    eventType: string;
    memberId: string;
    defaultExp: number;
    sourceModule: string;
    sourceEntityId?: string;
  }) {
    try {
      await this.rewards.processEvent({
        orgId: input.event.orgId,
        eventType: input.eventType,
        memberId: input.memberId,
        defaultExp: input.defaultExp,
        sourceModule: input.sourceModule,
        sourceEntityId: input.sourceEntityId,
        sourceEventId: input.event.id,
        payload: input.event.payload ?? {},
        actorUserId: input.event.actorUserId,
      });
    } catch (e) {
      this.logger.warn(
        `Failed to process reward automation for ${input.eventType}: ${(e as Error).message}`,
      );
    }
  }

  private async resolveProjectTaskRecipients(event: RewardDomainEvent) {
    const candidates = new Set<string>();
    const memberId = event.payload?.memberId;
    if (typeof memberId === 'string') candidates.add(memberId);

    const assigneeIds = event.payload?.assigneeIds;
    if (Array.isArray(assigneeIds)) {
      for (const id of assigneeIds) {
        if (typeof id === 'string') candidates.add(id);
      }
    }

    if (candidates.size === 0) return [];

    const ids = [...candidates];
    const directMembers = await this.prisma.orgMember.findMany({
      where: { orgId: event.orgId, id: { in: ids } },
      select: { id: true },
    });
    const directIds = new Set(directMembers.map((member) => member.id));
    const unresolvedIds = ids.filter((id) => !directIds.has(id));

    const userMembers =
      unresolvedIds.length > 0
        ? await this.prisma.orgMember.findMany({
            where: { orgId: event.orgId, userId: { in: unresolvedIds } },
            select: { id: true },
          })
        : [];

    return [
      ...new Set([
        ...directMembers.map((member) => member.id),
        ...userMembers.map((member) => member.id),
      ]),
    ];
  }
}
