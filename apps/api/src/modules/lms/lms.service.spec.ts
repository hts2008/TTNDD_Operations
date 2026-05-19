import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { LmsService } from './lms.service';

describe('LmsService mentor assignment', () => {
  const orgId = 'org-1';
  const courseId = 'course-1';
  const mentorId = 'mentor-1';
  const menteeId = 'mentee-1';
  const actorUserId = 'actor-1';

  const course = { id: courseId, title: 'Khoa huan luyen', status: 'published' };
  const mentor = {
    id: mentorId,
    role: 'leader',
    status: 'active',
    scoutName: 'Huynh truong',
    memberCode: 'HT-001',
    user: { displayName: 'Mentor User', email: 'mentor@example.com' },
  };
  const mentee = {
    id: menteeId,
    role: 'member',
    status: 'active',
    scoutName: 'Doan sinh',
    memberCode: 'DS-001',
    user: { displayName: 'Mentee User', email: 'mentee@example.com' },
  };
  const relationship = {
    id: 'relationship-1',
    orgId,
    mentorId,
    menteeId,
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    status: 'active',
  };

  let prisma: {
    course: { findFirst: jest.Mock };
    orgMember: { findMany: jest.Mock };
    mentoringRelationship: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };
  let service: LmsService;

  beforeEach(() => {
    prisma = {
      course: { findFirst: jest.fn().mockResolvedValue(course) },
      orgMember: { findMany: jest.fn().mockResolvedValue([mentor, mentee]) },
      mentoringRelationship: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(relationship),
        update: jest.fn().mockResolvedValue(relationship),
      },
    };
    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new LmsService(prisma as any, domainEvents as any, audit as any);
  });

  it('creates a mentoring relationship from an LMS course assignment', async () => {
    const result = await service.assignMentor(
      orgId,
      courseId,
      mentorId,
      menteeId,
      actorUserId,
      '2026-05-01',
    );

    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: { id: courseId, orgId },
      select: { id: true, title: true, status: true },
    });
    expect(prisma.orgMember.findMany).toHaveBeenCalledWith({
      where: { orgId, id: { in: [mentorId, menteeId] }, status: { not: 'left' } },
      select: {
        id: true,
        role: true,
        status: true,
        scoutName: true,
        memberCode: true,
        user: { select: { displayName: true, email: true } },
      },
    });
    expect(prisma.mentoringRelationship.create).toHaveBeenCalledWith({
      data: {
        orgId,
        mentorId,
        menteeId,
        startDate: new Date('2026-05-01'),
        status: 'active',
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        userId: actorUserId,
        action: 'lms.mentor_assigned',
        resource: 'MentoringRelationship',
        resourceId: relationship.id,
      }),
    );
    expect(domainEvents.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        eventType: DOMAIN_EVENTS.ENRICHMENT.MENTORING_STARTED,
        aggregateId: relationship.id,
        aggregateType: 'MentoringRelationship',
        actorUserId,
      }),
    );
    expect(result).toMatchObject({
      course,
      relationship,
      mentor,
      mentee,
      meta: { reusedExisting: false, source: 'lms' },
    });
  });

  it('reactivates and returns an existing relationship idempotently', async () => {
    prisma.mentoringRelationship.findFirst.mockResolvedValueOnce({
      ...relationship,
      status: 'inactive',
      startDate: null,
    });

    const result = await service.assignMentor(orgId, courseId, mentorId, menteeId, actorUserId);

    expect(prisma.mentoringRelationship.create).not.toHaveBeenCalled();
    expect(prisma.mentoringRelationship.update).toHaveBeenCalledWith({
      where: { id: relationship.id },
      data: { status: 'active', startDate: expect.any(Date) },
    });
    expect(result.meta).toEqual({ reusedExisting: true, source: 'lms' });
  });

  it('rejects assigning a member as their own mentor', async () => {
    await expect(
      service.assignMentor(orgId, courseId, mentorId, mentorId, actorUserId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires the course to exist in the organization', async () => {
    prisma.course.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.assignMentor(orgId, courseId, mentorId, menteeId, actorUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires both mentor and mentee members in the organization', async () => {
    prisma.orgMember.findMany.mockResolvedValueOnce([mentor]);

    await expect(
      service.assignMentor(orgId, courseId, mentorId, menteeId, actorUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
