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
      eventType: DOMAIN_EVENTS.LMS.LESSON_COMPLETED,
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

  // ── Quiz Attempt & Auto-Grading ──

  async submitQuizAttempt(orgId: string, quizId: string, memberId: string, answers: Array<{
    questionId: string; selectedAnswer: Prisma.InputJsonValue;
  }>, actorUserId: string) {
    const quiz = await this.getQuizById(orgId, quizId);

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

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.QUIZ_SUBMITTED,
      aggregateId: quizId,
      aggregateType: 'Quiz',
      payload: { memberId, quizId, score, passed } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: passed ? DOMAIN_EVENTS.LMS.QUIZ_PASSED : DOMAIN_EVENTS.LMS.QUIZ_FAILED,
      aggregateId: quizId,
      aggregateType: 'Quiz',
      payload: { memberId, quizId, score, passingScore: quiz.passingScore } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return {
      quizId,
      memberId,
      score,
      totalPoints,
      earnedPoints,
      passed,
      passingScore: quiz.passingScore,
      details: graded,
    };
  }
}
