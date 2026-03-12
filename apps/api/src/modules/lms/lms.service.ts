import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Course CRUD ──

  async createCourse(orgId: string, data: {
    title: string; description?: string; coverImageUrl?: string;
    category?: string; difficulty?: string; targetBranches?: string[];
    isPublic?: boolean; expReward?: number; totalDuration?: number;
  }, actorUserId: string) {
    const course = await this.prisma.course.create({
      data: {
        orgId,
        ...data,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'lms.course_created',
      resource: 'Course', resourceId: course.id,
      newValue: { title: data.title } as unknown as Prisma.InputJsonValue,
    });

    return course;
  }

  async findCourses(orgId: string, filters?: {
    category?: string; difficulty?: string; status?: string;
  }, page = 1, limit = 20) {
    const where: Prisma.CourseWhereInput = { orgId };
    if (filters?.category) where.category = filters.category;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          _count: { select: { lessons: true, quizzes: true, progress: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findCourseById(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId },
      include: {
        lessons: { orderBy: { orderIndex: 'asc' } },
        quizzes: { include: { _count: { select: { questions: true } } } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // ── Lesson CRUD ──

  async createLesson(orgId: string, courseId: string, data: {
    title: string; orderIndex?: number; lessonType?: string;
    content?: Prisma.InputJsonValue; videoUrl?: string;
    duration?: number; expReward?: number; isRequired?: boolean;
  }) {
    await this.findCourseById(orgId, courseId);

    return this.prisma.lesson.create({
      data: { orgId, courseId, ...data },
    });
  }

  async updateLesson(orgId: string, lessonId: string, data: Partial<{
    title: string; orderIndex: number; lessonType: string;
    content: Prisma.InputJsonValue; videoUrl: string;
    duration: number; expReward: number; isRequired: boolean;
  }>) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, orgId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data,
    });
  }

  async getLessons(orgId: string, courseId: string) {
    return this.prisma.lesson.findMany({
      where: { courseId, orgId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ── Quiz CRUD ──

  async createQuiz(orgId: string, data: {
    title: string; description?: string; quizType?: string;
    timeLimit?: number; passingScore?: number; randomizeQ?: boolean;
    maxRetries?: number; courseId?: string; expReward?: number;
  }, actorUserId: string) {
    return this.prisma.quiz.create({
      data: { orgId, ...data, createdBy: actorUserId },
    });
  }

  async getQuizzes(orgId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { orgId },
        include: { _count: { select: { questions: true, battles: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quiz.count({ where: { orgId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getQuizById(orgId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, orgId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async createQuestion(orgId: string, quizId: string, data: {
    questionText: string; questionType?: string;
    options: Prisma.InputJsonValue; correctAnswer?: Prisma.InputJsonValue;
    explanation?: string; points?: number; timeLimit?: number;
    mediaUrl?: string; orderIndex?: number;
  }) {
    await this.getQuizById(orgId, quizId);

    return this.prisma.quizQuestion.create({
      data: { orgId, quizId, ...data },
    });
  }

  async getQuestions(orgId: string, quizId: string) {
    return this.prisma.quizQuestion.findMany({
      where: { quizId, orgId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ── Quiz Battle Arena ──

  async createBattle(orgId: string, quizId: string, hostId: string, maxPlayers?: number) {
    await this.getQuizById(orgId, quizId);

    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return this.prisma.quizBattle.create({
      data: { orgId, quizId, hostId, gameCode, maxPlayers },
    });
  }

  async joinBattle(orgId: string, gameCode: string, playerId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'waiting' },
    });
    if (!battle) throw new NotFoundException('Battle not found or already started');

    const results = (battle.results as Record<string, unknown>) ?? {};
    if (Object.keys(results).length >= battle.maxPlayers) {
      throw new BadRequestException('Battle is full');
    }

    results[playerId] = { score: 0, joinedAt: new Date().toISOString() };

    return this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { results: results as Prisma.InputJsonValue },
    });
  }

  async getBattle(orgId: string, gameCode: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId },
      include: { quiz: { include: { questions: true } } },
    });
    if (!battle) throw new NotFoundException('Battle not found');
    return battle;
  }

  // ── Course Progress ──

  async startCourse(orgId: string, memberId: string, courseId: string, actorUserId: string) {
    await this.findCourseById(orgId, courseId);

    const progress = await this.prisma.memberCourseProgress.upsert({
      where: { orgMemberId_courseId: { orgMemberId: memberId, courseId } },
      create: {
        orgId, orgMemberId: memberId, courseId,
        status: 'in_progress', startedAt: new Date(),
      },
      update: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COURSE_ENROLLED,
      aggregateId: courseId,
      aggregateType: 'Course',
      payload: { memberId, courseId } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return progress;
  }

  async updateProgress(orgId: string, memberId: string, courseId: string, data: {
    progressPct: number; score?: number; expEarned?: number;
  }) {
    const progress = await this.prisma.memberCourseProgress.findFirst({
      where: { orgMemberId: memberId, courseId, orgId },
    });
    if (!progress) throw new NotFoundException('Progress record not found — enroll first');

    return this.prisma.memberCourseProgress.update({
      where: { id: progress.id },
      data: {
        progressPct: data.progressPct,
        score: data.score,
        expEarned: data.expEarned,
      },
    });
  }

  async completeCourse(orgId: string, memberId: string, courseId: string, actorUserId: string) {
    const progress = await this.prisma.memberCourseProgress.findFirst({
      where: { orgMemberId: memberId, courseId, orgId },
    });
    if (!progress) throw new NotFoundException('Progress record not found');

    const updated = await this.prisma.memberCourseProgress.update({
      where: { id: progress.id },
      data: { status: 'completed', completedAt: new Date(), progressPct: 100 },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
      aggregateId: courseId,
      aggregateType: 'Course',
      payload: { memberId, courseId } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  async getProgress(orgId: string, memberId: string) {
    return this.prisma.memberCourseProgress.findMany({
      where: { orgMemberId: memberId, orgId },
      include: { course: { select: { title: true, category: true, expReward: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  // ── Assignment CRUD (T-0108) ──

  async createAssignment(orgId: string, courseId: string, data: {
    orgMemberId: string; dueDate?: Date;
  }, actorUserId: string) {
    await this.findCourseById(orgId, courseId);

    const assignment = await this.prisma.courseAssignment.create({
      data: {
        orgId, courseId, orgMemberId: data.orgMemberId,
        assignedBy: actorUserId, dueDate: data.dueDate,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'lms.assignment_created',
      resource: 'CourseAssignment', resourceId: assignment.id,
      newValue: { courseId, memberId: data.orgMemberId } as unknown as Prisma.InputJsonValue,
    });

    return assignment;
  }

  async getAssignments(orgId: string, filters?: {
    courseId?: string; memberId?: string; status?: string;
  }, page = 1, limit = 20) {
    const where: Prisma.CourseAssignmentWhereInput = { orgId };
    if (filters?.courseId) where.courseId = filters.courseId;
    if (filters?.memberId) where.orgMemberId = filters.memberId;
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.courseAssignment.findMany({
        where,
        include: {
          course: { select: { title: true } },
          orgMember: { select: { id: true, role: true, scoutName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courseAssignment.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async submitAssignment(orgId: string, assignmentId: string, content: Prisma.InputJsonValue) {
    const assignment = await this.prisma.courseAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!['assigned', 'in_progress'].includes(assignment.status)) {
      throw new BadRequestException('Assignment cannot be submitted in current state');
    }

    return this.prisma.courseAssignment.update({
      where: { id: assignmentId },
      data: { status: 'submitted', content, submittedAt: new Date() },
    });
  }

  async gradeAssignment(orgId: string, assignmentId: string, data: {
    grade: number; feedback?: string;
  }, actorUserId: string) {
    const assignment = await this.prisma.courseAssignment.findFirst({
      where: { id: assignmentId, orgId, status: 'submitted' },
    });
    if (!assignment) throw new NotFoundException('Submitted assignment not found');

    return this.prisma.courseAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'graded', grade: data.grade, feedback: data.feedback,
        gradedBy: actorUserId, gradedAt: new Date(),
      },
    });
  }

  // ── Quiz Attempt & Auto-Grading (T-0112, T-0113) ──

  async submitQuizAttempt(orgId: string, quizId: string, memberId: string, answers: Array<{
    questionId: string; selectedAnswer: Prisma.InputJsonValue;
  }>, actorUserId: string) {
    const quiz = await this.getQuizById(orgId, quizId);

    // T-0113: Reattempt enforcement
    const attemptCount = await this.prisma.quizAttempt.count({
      where: { orgId, quizId, orgMemberId: memberId },
    });
    if (attemptCount >= quiz.maxRetries) {
      throw new BadRequestException(
        `Maximum retries (${quiz.maxRetries}) exceeded for this quiz`,
      );
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const graded = answers.map((a) => {
      const question = quiz.questions.find((q) => q.id === a.questionId);
      if (!question) return { ...a, correct: false, points: 0, maxPoints: 0 };

      totalPoints += question.points;
      const correct = JSON.stringify(question.correctAnswer) === JSON.stringify(a.selectedAnswer);
      if (correct) earnedPoints += question.points;

      return {
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        correct,
        points: correct ? question.points : 0,
        maxPoints: question.points,
      };
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;

    // T-0112: Persist QuizAttempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        orgId, quizId, orgMemberId: memberId,
        attemptNo: attemptCount + 1,
        status: 'submitted',
        answers: graded as unknown as Prisma.InputJsonValue,
        score, totalPoints, earnedPoints, passed,
        submittedAt: new Date(),
      },
    });

    // Check for essay/manual questions needing mentor review
    const hasManual = quiz.questions.some(
      (q) => q.questionType === 'essay' || q.questionType === 'manual',
    );
    if (hasManual) {
      await this.prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { status: 'pending_review' },
      });
    }

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.QUIZ_SUBMITTED,
      aggregateId: quizId,
      aggregateType: 'Quiz',
      payload: { memberId, quizId, score, passed, attemptId: attempt.id } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    if (!hasManual) {
      await this.domainEvents.publish({
        orgId,
        eventType: passed ? DOMAIN_EVENTS.LMS.QUIZ_PASSED : DOMAIN_EVENTS.LMS.QUIZ_FAILED,
        aggregateId: quizId,
        aggregateType: 'Quiz',
        payload: { memberId, quizId, score, passingScore: quiz.passingScore } as unknown as Prisma.InputJsonValue,
        actorUserId,
      });
    }

    return {
      attemptId: attempt.id,
      attemptNo: attemptCount + 1,
      quizId, memberId, score, totalPoints, earnedPoints, passed,
      passingScore: quiz.passingScore,
      needsManualReview: hasManual,
      details: graded,
    };
  }

  // ── Mentor Grading Queue (T-0114) ──

  async getMentorQueue(orgId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { orgId, status: 'pending_review' },
        include: {
          quiz: { select: { title: true, quizType: true } },
          orgMember: { select: { id: true, scoutName: true, role: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'asc' },
      }),
      this.prisma.quizAttempt.count({ where: { orgId, status: 'pending_review' } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async gradeAttempt(orgId: string, attemptId: string, data: {
    score: number; feedback?: string;
  }, actorUserId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, orgId, status: 'pending_review' },
      include: { quiz: true },
    });
    if (!attempt) throw new NotFoundException('Pending attempt not found');

    const passed = data.score >= attempt.quiz.passingScore;

    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'graded', score: data.score, passed,
        gradedBy: actorUserId, gradedAt: new Date(),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: passed ? DOMAIN_EVENTS.LMS.QUIZ_PASSED : DOMAIN_EVENTS.LMS.QUIZ_FAILED,
      aggregateId: attempt.quizId,
      aggregateType: 'Quiz',
      payload: {
        memberId: attempt.orgMemberId, quizId: attempt.quizId,
        score: data.score, passingScore: attempt.quiz.passingScore,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  // ── Gradebook Read Model (T-0115) ──

  async getGradebook(orgId: string, memberId: string) {
    const [courseProgress, quizAttempts, assignments] = await Promise.all([
      this.prisma.memberCourseProgress.findMany({
        where: { orgMemberId: memberId, orgId },
        include: { course: { select: { title: true, category: true, expReward: true } } },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.quizAttempt.findMany({
        where: { orgMemberId: memberId, orgId, status: { in: ['submitted', 'graded'] } },
        include: { quiz: { select: { title: true, passingScore: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courseAssignment.findMany({
        where: { orgMemberId: memberId, orgId },
        include: { course: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalCourses = courseProgress.length;
    const completedCourses = courseProgress.filter((p) => p.status === 'completed').length;
    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, a) => sum + Number(a.score ?? 0), 0) / quizAttempts.length)
      : 0;
    const totalExpEarned = courseProgress.reduce((sum, p) => sum + p.expEarned, 0);

    return {
      memberId,
      summary: { totalCourses, completedCourses, avgQuizScore, totalExpEarned },
      courses: courseProgress,
      quizAttempts,
      assignments,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // WP-4.5 — Parent Learning Dashboard & Mentor-Advisor Roles
  // ══════════════════════════════════════════════════════════════

  // ── T-0130: Privacy Masking Guards ──

  /** Verify that parentUserId has a GuardianLink to childMemberId */
  private async validateParentAccess(orgId: string, parentUserId: string, childMemberId: string) {
    const link = await this.prisma.guardianLink.findFirst({
      where: { orgId, userId: parentUserId, orgMemberId: childMemberId },
    });
    if (!link) {
      throw new BadRequestException('You do not have guardian access to this member');
    }
    return link;
  }

  /** Verify that mentorMemberId has an active MentoringRelationship to menteeMemberId */
  private async validateMentorAccess(orgId: string, mentorMemberId: string, menteeMemberId: string) {
    const rel = await this.prisma.mentoringRelationship.findFirst({
      where: { orgId, mentorId: mentorMemberId, menteeId: menteeMemberId, status: 'active' },
    });
    if (!rel) {
      throw new BadRequestException('You do not have mentor access to this member');
    }
    return rel;
  }

  /** Log child data access for COPPA compliance */
  private async logChildDataAccess(orgId: string, childMemberId: string, accessorUserId: string, accessorRole: string, accessType: string, resourceType: string, resourceId?: string) {
    await this.prisma.childDataAccessLog.create({
      data: {
        orgId, childMemberId, accessorUserId, accessorRole, accessType, resourceType,
        ...(resourceId ? { resourceId } : {}),
      },
    });
  }

  // ── T-0126: Parent Learning Read Model ──

  async getParentLearningView(orgId: string, parentUserId: string) {
    // Find all children linked to this parent via GuardianLink
    const guardianLinks = await this.prisma.guardianLink.findMany({
      where: { orgId, userId: parentUserId },
      include: {
        orgMember: { select: { id: true, scoutName: true, role: true, status: true } },
      },
    });

    if (guardianLinks.length === 0) {
      throw new NotFoundException('No children linked to this parent account');
    }

    // Fetch gradebook for each child
    const children = await Promise.all(
      guardianLinks.map(async (link) => {
        const childId = link.orgMemberId;

        // Get gradebook (reuses existing T-0115 method)
        const gradebook = await this.getGradebook(orgId, childId);

        // Get recent activity (last 5 course progress updates)
        const recentActivity = await this.prisma.memberCourseProgress.findMany({
          where: { orgMemberId: childId, orgId },
          include: { course: { select: { title: true } } },
          orderBy: { startedAt: 'desc' },
          take: 5,
        });

        // Log COPPA access
        await this.logChildDataAccess(orgId, childId, parentUserId, 'parent', 'view_grades', 'learning_progress');

        return {
          childMemberId: childId,
          childName: link.orgMember.scoutName ?? link.fullName,
          relation: link.relation,
          gradebook,
          recentActivity,
        };
      }),
    );

    // Emit domain event
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.PARENT_LEARNING_VIEWED,
      aggregateId: parentUserId,
      aggregateType: 'ParentDashboard',
      payload: { parentUserId, childCount: children.length } as unknown as Prisma.InputJsonValue,
      actorUserId: parentUserId,
    });

    return { parentUserId, children };
  }

  // ── T-0127: Mentor Scoped View ──

  async getMentorScopedView(orgId: string, mentorMemberId: string, actorUserId: string) {
    // Find all active mentoring relationships for this mentor
    const relationships = await this.prisma.mentoringRelationship.findMany({
      where: { orgId, mentorId: mentorMemberId, status: 'active' },
    });

    if (relationships.length === 0) {
      return { mentorMemberId, mentees: [] };
    }

    const menteeIds = relationships.map((r) => r.menteeId);

    // Fetch course progress and pending assignments for each mentee
    const mentees = await Promise.all(
      menteeIds.map(async (menteeId) => {
        const [courseProgress, pendingAssignments, pendingGrading] = await Promise.all([
          this.prisma.memberCourseProgress.findMany({
            where: { orgMemberId: menteeId, orgId },
            include: { course: { select: { title: true, category: true } } },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.courseAssignment.findMany({
            where: { orgMemberId: menteeId, orgId, status: { in: ['assigned', 'in_progress'] } },
            include: { course: { select: { title: true } } },
          }),
          this.prisma.quizAttempt.findMany({
            where: { orgMemberId: menteeId, orgId, status: 'pending_review' },
            include: { quiz: { select: { title: true } } },
            orderBy: { submittedAt: 'asc' },
          }),
        ]);

        // Get mentee name
        const mentee = await this.prisma.orgMember.findUnique({
          where: { id: menteeId },
          select: { scoutName: true, role: true },
        });

        return {
          menteeId,
          menteeName: mentee?.scoutName ?? menteeId,
          courseProgress,
          pendingAssignments,
          pendingGrading,
        };
      }),
    );

    // Emit domain event
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.MENTOR_SCOPE_ACCESSED,
      aggregateId: mentorMemberId,
      aggregateType: 'MentorDashboard',
      payload: { mentorMemberId, menteeCount: mentees.length } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return { mentorMemberId, mentees };
  }

  // ── T-0128: Evidence-to-Course Linkage ──

  async getEvidenceCourseLinkage(orgId: string, memberId: string) {
    // Get all skill progress with evidence for this member
    const skillProgress = await this.prisma.memberSkillProgress.findMany({
      where: { orgMemberId: memberId, orgId },
      include: {
        skill: { include: { domain: { select: { name: true } } } },
        evidence: true,
      },
    });

    // Get all courses for this org to cross-reference by category↔domain
    const courses = await this.prisma.course.findMany({
      where: { orgId, status: { not: 'archived' } },
      select: { id: true, title: true, category: true },
    });

    // Build domain→courses map
    const domainCourseMap = new Map<string, typeof courses>();
    for (const course of courses) {
      if (course.category) {
        const key = course.category.toLowerCase();
        if (!domainCourseMap.has(key)) domainCourseMap.set(key, []);
        domainCourseMap.get(key)!.push(course);
      }
    }

    // Cross-reference skills with courses via domain name ↔ category
    const linkage = skillProgress.map((sp) => {
      const domainName = sp.skill?.domain?.name?.toLowerCase() ?? '';
      const linkedCourses = domainCourseMap.get(domainName) ?? [];

      return {
        skillId: sp.skillId,
        skillName: sp.skill?.name ?? sp.skillId,
        domain: sp.skill?.domain?.name ?? 'Unknown',
        status: sp.status,
        evidenceCount: sp.evidence.length,
        evidence: sp.evidence.map((e) => ({
          id: e.id, url: e.url, note: e.note, capturedAt: e.capturedAt,
        })),
        linkedCourses: linkedCourses.map((c) => ({
          courseId: c.id, title: c.title, category: c.category,
        })),
      };
    });

    return { memberId, skills: linkage };
  }

  // ── T-0129: Learning Notification Hooks ──

  async emitLearningNotification(orgId: string, memberId: string, eventType: string, payload: {
    courseTitle?: string; quizTitle?: string; score?: number;
  }) {
    // Lookup guardians to notify
    const guardianLinks = await this.prisma.guardianLink.findMany({
      where: { orgId, orgMemberId: memberId, userId: { not: null } },
      select: { userId: true, fullName: true, relation: true },
    });

    // Get member name for notification text
    const member = await this.prisma.orgMember.findUnique({
      where: { id: memberId },
      select: { scoutName: true },
    });
    const memberName = member?.scoutName ?? 'Your child';

    // Build notification message
    let message = '';
    switch (eventType) {
      case DOMAIN_EVENTS.LMS.COURSE_COMPLETED:
        message = `${memberName} has completed the course "${payload.courseTitle}"`;
        break;
      case DOMAIN_EVENTS.LMS.QUIZ_PASSED:
        message = `${memberName} passed the quiz "${payload.quizTitle}" with score ${payload.score}%`;
        break;
      case DOMAIN_EVENTS.LMS.QUIZ_FAILED:
        message = `${memberName} needs more practice on "${payload.quizTitle}" (score: ${payload.score}%)`;
        break;
      default:
        message = `${memberName} has new learning activity`;
    }

    // Create notifications for each guardian with a linked user account
    const notifications = await Promise.all(
      guardianLinks
        .filter((g) => g.userId)
        .map(async (guardian) => {
          return this.prisma.notification.create({
            data: {
              orgId,
              recipientId: guardian.userId!,
              type: 'learning_progress',
              title: 'Learning Update',
              body: message,
              metadata: { memberId, eventType, ...payload } as unknown as Prisma.InputJsonValue,
            },
          });
        }),
    );

    return { notified: notifications.length, guardians: guardianLinks.length };
  }

  // ══════════════════════════════════════════════════════════════
  // WP-4.4 — Battle Arena & Live Quiz Rooms
  // ══════════════════════════════════════════════════════════════

  // ── T-0121: Room/Session Lifecycle ──

  /** Host starts the battle (waiting → active). Only the host can trigger. */
  async startBattle(orgId: string, gameCode: string, hostId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'waiting' },
    });
    if (!battle) throw new NotFoundException('Battle not found or already started');
    if (battle.hostId !== hostId) {
      throw new BadRequestException('Only the host can start this battle');
    }

    const results = (battle.results as Record<string, unknown>) ?? {};
    if (Object.keys(results).length < 1) {
      throw new BadRequestException('At least one player must join before starting');
    }

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { status: 'active', startedAt: new Date(), currentQuestion: 0 },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.BATTLE_STARTED,
      aggregateId: battle.id,
      aggregateType: 'QuizBattle',
      payload: { gameCode, quizId: battle.quizId, playerCount: Object.keys(results).length } as unknown as Prisma.InputJsonValue,
      actorUserId: hostId,
    });

    return updated;
  }

  /** End the battle (active → finished). Computes final scores and rankings. */
  async endBattle(orgId: string, gameCode: string, hostId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'active' },
      include: { quiz: { include: { questions: true } } },
    });
    if (!battle) throw new NotFoundException('Active battle not found');
    if (battle.hostId !== hostId) {
      throw new BadRequestException('Only the host can end this battle');
    }

    // Compute final ranking from results
    const results = (battle.results as Record<string, { score?: number }>) ?? {};
    const rankings = Object.entries(results)
      .map(([playerId, data]) => ({ playerId, score: data.score ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: {
        status: 'finished',
        endedAt: new Date(),
        results: { ...(results as Record<string, unknown>), _rankings: rankings } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.BATTLE_ENDED,
      aggregateId: battle.id,
      aggregateType: 'QuizBattle',
      payload: { gameCode, winnerId: rankings[0]?.playerId, rankings } as unknown as Prisma.InputJsonValue,
      actorUserId: hostId,
    });

    return { battle: updated, rankings };
  }

  // ── T-0123: Answer Timers + Scoring ──

  /** Submit a battle answer with time-bonus scoring. Server-authoritative. */
  async submitBattleAnswer(orgId: string, gameCode: string, playerId: string, data: {
    questionId: string; selectedAnswer: Prisma.InputJsonValue; elapsedMs: number;
  }) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'active' },
      include: { quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
    });
    if (!battle) throw new NotFoundException('Active battle not found');

    const question = battle.quiz.questions.find((q) => q.id === data.questionId);
    if (!question) throw new NotFoundException('Question not found in this quiz');

    // Validate this is the current question
    const currentQ = battle.quiz.questions[battle.currentQuestion];
    if (!currentQ || currentQ.id !== data.questionId) {
      throw new BadRequestException('This is not the current question');
    }

    // Check correctness
    const correct = JSON.stringify(question.correctAnswer) === JSON.stringify(data.selectedAnswer);

    // Time-bonus formula: basePoints * max(0, 1 - elapsed / timeLimit)
    const timeLimitMs = (question.timeLimit ?? battle.quiz.timeLimit ?? 30) * 1000;
    const timeBonus = Math.max(0, 1 - data.elapsedMs / timeLimitMs);
    const earnedPoints = correct ? Math.round(question.points * (0.5 + 0.5 * timeBonus)) : 0;

    // Update player results
    const results = (battle.results as Record<string, Record<string, unknown>>) ?? {};
    const playerData = results[playerId] ?? { score: 0 };
    playerData.score = (Number(playerData.score) || 0) + earnedPoints;
    playerData[`q_${data.questionId}`] = {
      correct, earnedPoints, elapsedMs: data.elapsedMs, answeredAt: new Date().toISOString(),
    };
    results[playerId] = playerData;

    await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { results: results as unknown as Prisma.InputJsonValue },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.BATTLE_ANSWER_SUBMITTED,
      aggregateId: battle.id,
      aggregateType: 'QuizBattle',
      payload: { gameCode, playerId, questionId: data.questionId, correct, earnedPoints } as unknown as Prisma.InputJsonValue,
      actorUserId: playerId,
    });

    return { correct, earnedPoints, totalScore: playerData.score, timeBonus: Math.round(timeBonus * 100) };
  }

  /** Advance to the next question (host only). */
  async advanceQuestion(orgId: string, gameCode: string, hostId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'active' },
      include: { quiz: { include: { _count: { select: { questions: true } } } } },
    });
    if (!battle) throw new NotFoundException('Active battle not found');
    if (battle.hostId !== hostId) {
      throw new BadRequestException('Only the host can advance questions');
    }

    const nextQ = battle.currentQuestion + 1;
    if (nextQ >= battle.quiz._count.questions) {
      throw new BadRequestException('No more questions — end the battle instead');
    }

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { currentQuestion: nextQ },
    });

    return { currentQuestion: nextQ, totalQuestions: battle.quiz._count.questions, battle: updated };
  }

  // ── T-0125: Budget Flag / Room-Size Limit ──

  /** Check if Battle Arena feature is enabled for the org. */
  async isBattleEnabled(orgId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    if (!org) return false;
    const settings = (org.settings as Record<string, unknown>) ?? {};
    // Default: enabled unless explicitly disabled
    if (settings['battle.enabled'] === false || settings['battle.enabled'] === 'false') return false;
    return true;
  }

  /** Get battle configuration (room-size limits, feature flags). */
  async getBattleConfig(orgId: string) {
    const enabled = await this.isBattleEnabled(orgId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const settings = ((org?.settings as Record<string, unknown>) ?? {});

    // Budget mode (low-cost capped rooms)
    const budgetMode = settings['battle.budgetMode'] === true || settings['battle.budgetMode'] === 'true';

    // Room size limits
    const defaultMax = budgetMode ? 15 : 30;
    const maxPlayers = typeof settings['battle.maxPlayers'] === 'number'
      ? settings['battle.maxPlayers']
      : defaultMax;

    // Concurrent rooms limit
    const maxConcurrentRooms = typeof settings['battle.maxConcurrentRooms'] === 'number'
      ? settings['battle.maxConcurrentRooms']
      : 5;

    // Count current active rooms
    const activeRooms = await this.prisma.quizBattle.count({
      where: { orgId, status: { in: ['waiting', 'active'] } },
    });

    return {
      enabled,
      budgetMode,
      maxPlayers,
      maxConcurrentRooms,
      activeRooms,
      canCreateRoom: enabled && activeRooms < maxConcurrentRooms,
    };
  }

  // ── WP-4.3: Offline Packs & PWA Sync (T-0117) ──

  /**
   * Build a self-contained offline pack for a course.
   * Includes lessons, quizzes with questions, and checklists.
   */
  async getOfflinePack(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true, title: true, lessonType: true, content: true,
            videoUrl: true, orderIndex: true, duration: true,
          },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true, questionText: true, questionType: true,
                options: true, correctAnswer: true, points: true,
                timeLimit: true, orderIndex: true,
              },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException(`Course ${courseId} not found`);

    // Collect media URLs for pre-caching
    const mediaUrls: string[] = [];
    for (const lesson of course.lessons) {
      if (lesson.videoUrl) mediaUrls.push(lesson.videoUrl);
    }

    return {
      courseId: course.id,
      title: (course as unknown as { title: string }).title,
      generatedAt: new Date().toISOString(),
      lessons: course.lessons,
      quizzes: course.quizzes.map((q) => ({
        id: q.id,
        title: (q as unknown as { title: string }).title,
        timeLimit: q.timeLimit,
        questions: q.questions,
      })),
      mediaUrls,
      estimatedSizeBytes: JSON.stringify(course).length * 2, // rough estimate
    };
  }

  /**
   * Accept queued offline results (attempts + checklist completions).
   * Applies conflict resolution: server-wins for scored data.
   */
  async syncOfflineResults(orgId: string, userId: string, results: Array<{
    type: 'quiz_attempt' | 'checklist_completion';
    entityId: string;
    data: Record<string, unknown>;
    clientTimestamp: string;
  }>) {
    const syncResults: Array<{ type: string; entityId: string; status: string; reason?: string }> = [];

    for (const item of results) {
      try {
        if (item.type === 'quiz_attempt') {
          // Server-wins: if server already has a higher score, skip
          // Find orgMemberId for this user
          const member = await this.prisma.orgMember.findFirst({
            where: { userId, orgId, status: 'active' },
            select: { id: true },
          });
          if (!member) {
            syncResults.push({ type: item.type, entityId: item.entityId, status: 'error', reason: 'member_not_found' });
            continue;
          }

          const existing = await this.prisma.quizAttempt.findFirst({
            where: { quizId: item.entityId, orgMemberId: member.id, orgId },
            orderBy: { score: 'desc' },
          });

          const clientScore = Number(item.data.score) || 0;
          if (existing && Number(existing.score ?? 0) >= clientScore) {
            syncResults.push({ type: item.type, entityId: item.entityId, status: 'skipped', reason: 'server_score_higher' });
            continue;
          }

          await this.prisma.quizAttempt.create({
            data: {
              quizId: item.entityId,
              orgMemberId: member.id,
              orgId,
              score: clientScore,
              answers: item.data.answers as Prisma.InputJsonValue ?? {},
              startedAt: new Date(item.clientTimestamp),
              submittedAt: new Date(),
              status: 'submitted',
            },
          });
          syncResults.push({ type: item.type, entityId: item.entityId, status: 'synced' });
        } else if (item.type === 'checklist_completion') {
          // Client-wins: always accept draft checklist progress
          syncResults.push({ type: item.type, entityId: item.entityId, status: 'synced' });
        }
      } catch (error) {
        syncResults.push({
          type: item.type, entityId: item.entityId,
          status: 'error', reason: (error as Error).message,
        });
      }
    }

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
      aggregateId: userId,
      aggregateType: 'User',
      payload: { action: 'offline_sync', resultCount: results.length } as unknown as Prisma.InputJsonValue,
      actorUserId: userId,
    });

    return { syncedAt: new Date().toISOString(), results: syncResults };
  }
}
