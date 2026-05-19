import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { FileStorageService } from '../file-storage';

@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
    @Optional() private readonly fileStorage?: FileStorageService,
  ) {}

  // ── Course CRUD ──

  async createCourse(
    orgId: string,
    data: {
      title: string;
      description?: string;
      coverImageUrl?: string;
      coverImageFileRefId?: string;
      category?: string;
      difficulty?: string;
      targetBranches?: string[];
      isPublic?: boolean;
      expReward?: number;
      totalDuration?: number;
    },
    actorUserId: string,
  ) {
    await this.assertReadyFileRefs(orgId, [data.coverImageFileRefId]);

    const course = await this.prisma.course.create({
      data: {
        orgId,
        ...data,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'lms.course_created',
      resource: 'Course',
      resourceId: course.id,
      newValue: { title: data.title } as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COURSE_CREATED,
      aggregateId: course.id,
      aggregateType: 'Course',
      payload: { courseId: course.id, title: data.title } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return course;
  }

  async updateCourse(
    orgId: string,
    courseId: string,
    data: Partial<{
      title: string;
      description: string;
      coverImageUrl: string;
      coverImageFileRefId: string;
      category: string;
      difficulty: string;
      targetBranches: string[];
      isPublic: boolean;
      expReward: number;
      totalDuration: number;
      status: string;
    }>,
    actorUserId: string,
  ) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, orgId } });
    if (!course) throw new NotFoundException('Course not found');
    await this.assertReadyFileRefs(orgId, [data.coverImageFileRefId]);

    const publishData: Prisma.CourseUpdateInput = { ...data };
    if (data.status === 'published' && course.status !== 'published') {
      publishData.publishedAt = new Date();
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: publishData,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'lms.course_updated',
      resource: 'Course',
      resourceId: courseId,
      oldValue: { title: course.title, status: course.status } as unknown as Prisma.InputJsonValue,
      newValue: data as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COURSE_UPDATED,
      aggregateId: courseId,
      aggregateType: 'Course',
      payload: { courseId, changes: Object.keys(data) } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  async deleteCourse(orgId: string, courseId: string, actorUserId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, orgId } });
    if (!course) throw new NotFoundException('Course not found');

    await this.prisma.course.delete({ where: { id: courseId } });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'lms.course_deleted',
      resource: 'Course',
      resourceId: courseId,
      oldValue: { title: course.title } as unknown as Prisma.InputJsonValue,
    });
  }

  async findCourses(
    orgId: string,
    filters?: {
      category?: string;
      difficulty?: string;
      status?: string;
    },
    page = 1,
    limit = 20,
  ) {
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
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: { lessons: { orderBy: { orderIndex: 'asc' } } },
        },
        lessons: { orderBy: { orderIndex: 'asc' } },
        quizzes: { include: { _count: { select: { questions: true } } } },
        competencies: { include: { competency: true } },
        completionRules: true,
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // ── Course Module CRUD ──

  async createModule(
    orgId: string,
    courseId: string,
    data: {
      title: string;
      description?: string;
      orderIndex?: number;
    },
  ) {
    await this.findCourseById(orgId, courseId);
    return this.prisma.courseModule.create({
      data: { orgId, courseId, ...data },
    });
  }

  async getModules(orgId: string, courseId: string) {
    return this.prisma.courseModule.findMany({
      where: { courseId, orgId },
      include: { lessons: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async updateModule(
    orgId: string,
    moduleId: string,
    data: Partial<{
      title: string;
      description: string;
      orderIndex: number;
    }>,
  ) {
    const mod = await this.prisma.courseModule.findFirst({ where: { id: moduleId, orgId } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.prisma.courseModule.update({ where: { id: moduleId }, data });
  }

  async deleteModule(orgId: string, moduleId: string) {
    const mod = await this.prisma.courseModule.findFirst({ where: { id: moduleId, orgId } });
    if (!mod) throw new NotFoundException('Module not found');
    await this.prisma.courseModule.delete({ where: { id: moduleId } });
  }

  // ── Lesson CRUD ──

  async createLesson(
    orgId: string,
    courseId: string,
    data: {
      title: string;
      orderIndex?: number;
      lessonType?: string;
      content?: Prisma.InputJsonValue;
      videoUrl?: string;
      mediaFileRefId?: string;
      duration?: number;
      expReward?: number;
      isRequired?: boolean;
      moduleId?: string;
    },
  ) {
    await this.findCourseById(orgId, courseId);
    await this.assertReadyFileRefs(orgId, [data.mediaFileRefId]);

    return this.prisma.lesson.create({
      data: { orgId, courseId, ...data },
    });
  }

  async updateLesson(
    orgId: string,
    lessonId: string,
    data: Partial<{
      title: string;
      orderIndex: number;
      lessonType: string;
      content: Prisma.InputJsonValue;
      videoUrl: string;
      mediaFileRefId: string;
      duration: number;
      expReward: number;
      isRequired: boolean;
      moduleId: string;
    }>,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, orgId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertReadyFileRefs(orgId, [data.mediaFileRefId]);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data,
    });
  }

  async deleteLesson(orgId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, orgId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  async getLessons(orgId: string, courseId: string) {
    return this.prisma.lesson.findMany({
      where: { courseId, orgId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ── Competency CRUD (T-1122) ──

  async createCompetency(
    orgId: string,
    data: {
      competencyCode: string;
      name: string;
      description?: string;
      category?: string;
    },
  ) {
    return this.prisma.competency.create({ data: { orgId, ...data } });
  }

  async listCompetencies(orgId: string, category?: string) {
    const where: Prisma.CompetencyWhereInput = { orgId };
    if (category) where.category = category;
    return this.prisma.competency.findMany({ where, orderBy: { name: 'asc' } });
  }

  async mapCompetencyToCourse(
    orgId: string,
    courseId: string,
    competencyId: string,
    actorUserId: string,
  ) {
    await this.findCourseById(orgId, courseId);
    const competency = await this.prisma.competency.findFirst({
      where: { id: competencyId, orgId },
    });
    if (!competency) throw new NotFoundException('Competency not found');

    const mapping = await this.prisma.courseCompetency.create({
      data: { orgId, courseId, competencyId },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COMPETENCY_MAPPED,
      aggregateId: courseId,
      aggregateType: 'Course',
      payload: {
        courseId,
        competencyId,
        competencyCode: competency.competencyCode,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return mapping;
  }

  // ── Completion Rules (T-1122) ──

  async addCompletionRule(
    orgId: string,
    courseId: string,
    data: {
      ruleType: string;
      config?: Prisma.InputJsonValue;
    },
  ) {
    await this.findCourseById(orgId, courseId);
    return this.prisma.completionRule.create({
      data: { orgId, courseId, ruleType: data.ruleType, config: data.config ?? {} },
    });
  }

  async checkCompletionRules(
    orgId: string,
    courseId: string,
    memberId: string,
  ): Promise<{
    allPassed: boolean;
    results: Array<{ ruleType: string; passed: boolean }>;
  }> {
    const rules = await this.prisma.completionRule.findMany({ where: { courseId, orgId } });
    if (rules.length === 0) return { allPassed: true, results: [] };

    const results: Array<{ ruleType: string; passed: boolean }> = [];

    for (const rule of rules) {
      let passed = false;
      switch (rule.ruleType) {
        case 'all_lessons': {
          const totalLessons = await this.prisma.lesson.count({
            where: { courseId, orgId, isRequired: true },
          });
          const completedLessons = await this.prisma.lessonProgress.count({
            where: { orgMemberId: memberId, lesson: { courseId }, status: 'completed' },
          });
          passed = totalLessons > 0 && completedLessons >= totalLessons;
          break;
        }
        case 'min_score': {
          const config = rule.config as { minScore?: number };
          const progress = await this.prisma.memberCourseProgress.findFirst({
            where: { orgMemberId: memberId, courseId },
          });
          passed = progress?.score ? Number(progress.score) >= (config.minScore ?? 70) : false;
          break;
        }
        default:
          passed = false;
      }
      results.push({ ruleType: rule.ruleType, passed });
    }

    return { allPassed: results.every((r) => r.passed), results };
  }

  // ── Quiz CRUD ──

  async createQuiz(
    orgId: string,
    data: {
      title: string;
      description?: string;
      quizType?: string;
      timeLimit?: number;
      passingScore?: number;
      randomizeQ?: boolean;
      maxRetries?: number;
      courseId?: string;
      expReward?: number;
    },
    actorUserId: string,
  ) {
    return this.prisma.quiz.create({
      data: { orgId, ...data, createdBy: actorUserId },
    });
  }

  async getQuizzes(orgId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { orgId },
        include: { _count: { select: { questions: true, battles: true, attempts: true } } },
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

  async getQuizPublic(orgId: string, quizId: string) {
    const quiz = await this.getQuizById(orgId, quizId);
    return {
      ...quiz,
      questions: quiz.questions.map(({ correctAnswer, ...q }) => q),
    };
  }

  async createQuestion(
    orgId: string,
    quizId: string,
    data: {
      questionText: string;
      questionType?: string;
      options: Prisma.InputJsonValue;
      correctAnswer?: Prisma.InputJsonValue;
      explanation?: string;
      points?: number;
      timeLimit?: number;
      mediaUrl?: string;
      mediaFileRefId?: string;
      orderIndex?: number;
    },
  ) {
    await this.getQuizById(orgId, quizId);
    await this.assertReadyFileRefs(orgId, [data.mediaFileRefId]);

    return this.prisma.quizQuestion.create({
      data: { orgId, quizId, ...data },
    });
  }

  private async assertReadyFileRefs(orgId: string, fileRefIds: Array<string | undefined>) {
    const requested = fileRefIds.filter(Boolean);
    if (requested.length === 0) return;
    if (!this.fileStorage) throw new BadRequestException('File storage integration unavailable');
    await this.fileStorage.assertReadyFileRefs(orgId, requested);
  }

  async getQuestions(orgId: string, quizId: string) {
    return this.prisma.quizQuestion.findMany({
      where: { quizId, orgId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ── Quiz Battle Arena — State Machine ──
  // States: lobby → countdown → active → finished

  async createBattle(orgId: string, quizId: string, hostId: string, maxPlayers?: number) {
    await this.getQuizById(orgId, quizId);

    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return this.prisma.quizBattle.create({
      data: { orgId, quizId, hostId, gameCode, maxPlayers, status: 'lobby' },
    });
  }

  async joinBattle(orgId: string, gameCode: string, playerId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'lobby' },
    });
    if (!battle) throw new NotFoundException('Battle not found or already started');

    const results = (battle.results as Record<string, unknown>) ?? {};
    if (Object.keys(results).length >= battle.maxPlayers) {
      throw new BadRequestException('Battle is full');
    }

    // Duplicate player guard
    if (results[playerId]) {
      throw new BadRequestException('Already joined this battle');
    }

    results[playerId] = { score: 0, answers: [], joinedAt: new Date().toISOString() };

    return this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { results: results as Prisma.InputJsonValue },
    });
  }

  async startBattle(orgId: string, gameCode: string, actorUserId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'lobby' },
    });
    if (!battle) throw new NotFoundException('Battle not found or not in lobby state');
    if (battle.hostId !== actorUserId)
      throw new BadRequestException('Only the host can start the battle');

    const results = (battle.results as Record<string, unknown>) ?? {};
    if (Object.keys(results).length < 2) {
      throw new BadRequestException('Need at least 2 players to start');
    }

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { status: 'active', startedAt: new Date() },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.BATTLE_STARTED,
      aggregateId: battle.id,
      aggregateType: 'QuizBattle',
      payload: {
        gameCode,
        quizId: battle.quizId,
        playerCount: Object.keys(results).length,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return updated;
  }

  async submitBattleAnswer(
    orgId: string,
    gameCode: string,
    playerId: string,
    data: {
      questionId: string;
      answer: unknown;
      clientTimestamp?: string;
    },
  ) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'active' },
      include: { quiz: { include: { questions: true } } },
    });
    if (!battle) throw new NotFoundException('Battle not found or not active');

    const results =
      (battle.results as Record<
        string,
        {
          score: number;
          answers: Array<{ questionId: string; answeredAt: string }>;
          joinedAt: string;
        }
      >) ?? {};
    const playerData = results[playerId];
    if (!playerData) throw new BadRequestException('Player not in this battle');

    // Anti-cheat: duplicate submission guard
    const alreadyAnswered = playerData.answers?.some((a) => a.questionId === data.questionId);
    if (alreadyAnswered) throw new BadRequestException('Already answered this question');

    // Anti-cheat: minimum answer interval (2 seconds between answers)
    const now = new Date();
    if (playerData.answers?.length > 0) {
      const lastAnswer = playerData.answers[playerData.answers.length - 1];
      if (lastAnswer) {
        const lastTime = new Date(lastAnswer.answeredAt).getTime();
        if (now.getTime() - lastTime < 2000) {
          throw new BadRequestException('Answering too fast — minimum 2 second interval');
        }
      }
    }

    // Grade the answer
    const question = battle.quiz.questions.find((q) => q.id === data.questionId);
    if (!question) throw new BadRequestException('Question not in this quiz');

    let pointsEarned = 0;
    const correctAnswer = (question.options as Record<string, unknown>)?.correctAnswer;
    if (
      correctAnswer !== undefined &&
      JSON.stringify(data.answer) === JSON.stringify(correctAnswer)
    ) {
      // Speed bonus: faster answers get more points (max 100, min 50)
      const elapsedMs = battle.startedAt ? now.getTime() - new Date(battle.startedAt).getTime() : 0;
      const speedFactor = Math.max(0.5, 1 - elapsedMs / 120000); // diminish over 2 min
      pointsEarned = Math.round(100 * speedFactor);
    }

    playerData.score += pointsEarned;
    playerData.answers.push({ questionId: data.questionId, answeredAt: now.toISOString() });

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { results: results as unknown as Prisma.InputJsonValue },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.BATTLE_ANSWER_SUBMITTED,
      aggregateId: battle.id,
      aggregateType: 'QuizBattle',
      payload: {
        gameCode,
        playerId,
        questionId: data.questionId,
        pointsEarned,
      } as unknown as Prisma.InputJsonValue,
      actorUserId: playerId,
    });

    return { pointsEarned, totalScore: playerData.score };
  }

  async finishBattle(orgId: string, gameCode: string, actorUserId: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId, status: 'active' },
    });
    if (!battle) throw new NotFoundException('Battle not found or not active');

    const results = (battle.results as Record<string, { score: number }>) ?? {};
    const rankings = Object.entries(results)
      .map(([playerId, data]) => ({ playerId, score: data.score }))
      .sort((a, b) => b.score - a.score);

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { status: 'finished', endedAt: new Date() },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.BATTLE_FINISHED,
      aggregateId: battle.id,
      aggregateType: 'QuizBattle',
      payload: {
        gameCode,
        winnerId: rankings[0]?.playerId,
        rankings,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return { ...updated, rankings };
  }

  async getBattle(orgId: string, gameCode: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId },
      include: {
        quiz: {
          include: {
            questions: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });
    if (!battle) throw new NotFoundException('Battle not found');
    return battle;
  }

  async getBattleScoreboard(orgId: string, gameCode: string) {
    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode, orgId },
    });
    if (!battle) throw new NotFoundException('Battle not found');

    const results =
      (battle.results as Record<string, { score: number; answers: unknown[]; joinedAt: string }>) ??
      {};

    return Object.entries(results)
      .map(([playerId, data]) => ({
        playerId,
        score: data.score,
        answersCount: data.answers?.length ?? 0,
        joinedAt: data.joinedAt,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  // ── Course Progress (T-1124) ──

  async startCourse(orgId: string, memberId: string, courseId: string, actorUserId: string) {
    await this.findCourseById(orgId, courseId);

    const progress = await this.prisma.memberCourseProgress.upsert({
      where: { orgMemberId_courseId: { orgMemberId: memberId, courseId } },
      create: {
        orgId,
        orgMemberId: memberId,
        courseId,
        status: 'in_progress',
        startedAt: new Date(),
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

  async completeLesson(orgId: string, memberId: string, lessonId: string, actorUserId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, orgId },
      include: { course: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const lessonProgress = await this.prisma.lessonProgress.upsert({
      where: { orgMemberId_lessonId: { orgMemberId: memberId, lessonId } },
      create: {
        orgId,
        orgMemberId: memberId,
        lessonId,
        status: 'completed',
        completedAt: new Date(),
      },
      update: { status: 'completed', completedAt: new Date() },
    });

    // Auto-recalculate course progress
    const totalRequired = await this.prisma.lesson.count({
      where: { courseId: lesson.courseId, orgId, isRequired: true },
    });
    const completedRequired = await this.prisma.lessonProgress.count({
      where: {
        orgMemberId: memberId,
        lesson: { courseId: lesson.courseId, isRequired: true },
        status: 'completed',
      },
    });

    const progressPct =
      totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

    await this.prisma.memberCourseProgress.upsert({
      where: { orgMemberId_courseId: { orgMemberId: memberId, courseId: lesson.courseId } },
      create: {
        orgId,
        orgMemberId: memberId,
        courseId: lesson.courseId,
        status: 'in_progress',
        progressPct,
        startedAt: new Date(),
      },
      update: { progressPct },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.LESSON_COMPLETED,
      aggregateId: lessonId,
      aggregateType: 'Lesson',
      payload: {
        memberId,
        lessonId,
        courseId: lesson.courseId,
        progressPct,
        expReward: lesson.expReward,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    // Auto-complete course if all required lessons are done
    if (progressPct >= 100) {
      await this.completeCourse(orgId, memberId, lesson.courseId, actorUserId);
    }

    return lessonProgress;
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

    const course = await this.prisma.course.findFirst({ where: { id: courseId } });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.COURSE_COMPLETED,
      aggregateId: courseId,
      aggregateType: 'Course',
      payload: {
        memberId,
        courseId,
        expReward: course?.expReward ?? 0,
      } as unknown as Prisma.InputJsonValue,
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

  // ── Quiz Attempt with State Machine (T-1127, T-1128) ──

  async startQuizAttempt(orgId: string, quizId: string, memberId: string, actorUserId: string) {
    const quiz = await this.getQuizById(orgId, quizId);

    // Enforce maxRetries
    const attemptCount = await this.prisma.quizAttempt.count({
      where: { quizId, orgMemberId: memberId, orgId },
    });
    if (attemptCount >= quiz.maxRetries) {
      throw new BadRequestException(`Maximum retries (${quiz.maxRetries}) exceeded for this quiz`);
    }

    // Check for existing in_progress attempt
    const existing = await this.prisma.quizAttempt.findFirst({
      where: { quizId, orgMemberId: memberId, orgId, status: 'in_progress' },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have an in-progress attempt. Submit or let it expire first.',
      );
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        orgId,
        quizId,
        orgMemberId: memberId,
        attemptNumber: attemptCount + 1,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.QUIZ_ATTEMPT_STARTED,
      aggregateId: attempt.id,
      aggregateType: 'QuizAttempt',
      payload: {
        quizId,
        memberId,
        attemptNumber: attempt.attemptNumber,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    return attempt;
  }

  async submitQuizAttempt(
    orgId: string,
    attemptId: string,
    answers: Array<{
      questionId: string;
      selectedAnswer: Prisma.InputJsonValue;
    }>,
    actorUserId: string,
  ) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, orgId, status: 'in_progress' },
    });
    if (!attempt) throw new NotFoundException('No active attempt found');

    const quiz = await this.getQuizById(orgId, attempt.quizId);

    // Check time limit
    if (quiz.timeLimit) {
      const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000;
      if (elapsed > quiz.timeLimit) {
        await this.prisma.quizAttempt.update({
          where: { id: attemptId },
          data: { status: 'expired', submittedAt: new Date() },
        });
        await this.domainEvents.publish({
          orgId,
          eventType: DOMAIN_EVENTS.LMS.QUIZ_ATTEMPT_EXPIRED,
          aggregateId: attemptId,
          aggregateType: 'QuizAttempt',
          payload: {
            quizId: quiz.id,
            memberId: attempt.orgMemberId,
            elapsed,
          } as unknown as Prisma.InputJsonValue,
          actorUserId,
        });
        throw new BadRequestException('Time limit exceeded. Attempt expired.');
      }
    }

    // Auto-grade (only for auto-gradable question types)
    const hasEssay = quiz.questions.some((q) => q.questionType === 'essay');
    let totalPoints = 0;
    let earnedPoints = 0;

    const graded = answers.map((a) => {
      const question = quiz.questions.find((q) => q.id === a.questionId);
      if (!question)
        return { ...a, correct: false, points: 0, maxPoints: 0, needsManualGrade: false };

      totalPoints += question.points;

      if (question.questionType === 'essay') {
        return {
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer,
          correct: null,
          points: 0,
          maxPoints: question.points,
          needsManualGrade: true,
        };
      }

      const correct = JSON.stringify(question.correctAnswer) === JSON.stringify(a.selectedAnswer);
      if (correct) earnedPoints += question.points;

      return {
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        correct,
        points: correct ? question.points : 0,
        maxPoints: question.points,
        needsManualGrade: false,
      };
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const status = hasEssay ? 'submitted' : 'graded';
    const passed = hasEssay ? null : score >= quiz.passingScore;

    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        answers: graded as unknown as Prisma.InputJsonValue,
        score,
        passed,
        submittedAt: new Date(),
        gradedAt: hasEssay ? null : new Date(),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.QUIZ_SUBMITTED,
      aggregateId: attempt.quizId,
      aggregateType: 'Quiz',
      payload: {
        memberId: attempt.orgMemberId,
        quizId: attempt.quizId,
        score,
        passed,
        attemptId,
      } as unknown as Prisma.InputJsonValue,
      actorUserId,
    });

    if (!hasEssay) {
      await this.domainEvents.publish({
        orgId,
        eventType: passed ? DOMAIN_EVENTS.LMS.QUIZ_PASSED : DOMAIN_EVENTS.LMS.QUIZ_FAILED,
        aggregateId: attempt.quizId,
        aggregateType: 'Quiz',
        payload: {
          memberId: attempt.orgMemberId,
          quizId: attempt.quizId,
          score,
          passingScore: quiz.passingScore,
        } as unknown as Prisma.InputJsonValue,
        actorUserId,
      });
    }

    return {
      attemptId,
      quizId: attempt.quizId,
      memberId: attempt.orgMemberId,
      score,
      totalPoints,
      earnedPoints,
      passed,
      passingScore: quiz.passingScore,
      status,
      details: graded,
    };
  }

  async getAttemptHistory(orgId: string, quizId: string, memberId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, orgMemberId: memberId, orgId },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  // ── Manual Grading (T-1129) ──

  async getGradingQueue(orgId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { orgId, status: 'submitted' },
      include: {
        quiz: { select: { title: true } },
        orgMember: { select: { id: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async gradeAttempt(
    orgId: string,
    attemptId: string,
    data: {
      score: number;
      passed: boolean;
      feedback?: string;
    },
    graderId: string,
  ) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, orgId, status: 'submitted' },
    });
    if (!attempt) throw new NotFoundException('Attempt not found or already graded');

    const quiz = await this.prisma.quiz.findFirst({ where: { id: attempt.quizId } });

    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'graded',
        score: data.score,
        passed: data.passed,
        feedback: data.feedback,
        gradedAt: new Date(),
        gradedBy: graderId,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.LMS.QUIZ_MANUALLY_GRADED,
      aggregateId: attemptId,
      aggregateType: 'QuizAttempt',
      payload: {
        quizId: attempt.quizId,
        memberId: attempt.orgMemberId,
        score: data.score,
        passed: data.passed,
        graderId,
      } as unknown as Prisma.InputJsonValue,
      actorUserId: graderId,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: data.passed ? DOMAIN_EVENTS.LMS.QUIZ_PASSED : DOMAIN_EVENTS.LMS.QUIZ_FAILED,
      aggregateId: attempt.quizId,
      aggregateType: 'Quiz',
      payload: {
        memberId: attempt.orgMemberId,
        quizId: attempt.quizId,
        score: data.score,
        passingScore: quiz?.passingScore,
      } as unknown as Prisma.InputJsonValue,
      actorUserId: graderId,
    });

    return updated;
  }

  // ── Mentor Assignment (T-1125) ──

  async assignMentor(
    orgId: string,
    courseId: string,
    mentorId: string,
    menteeId: string,
    actorUserId: string,
    startDate?: string,
  ) {
    if (!mentorId || !menteeId) {
      throw new BadRequestException('mentorId and menteeId are required');
    }
    if (mentorId === menteeId) {
      throw new BadRequestException('Mentor and mentee must be different members');
    }

    const [course, members, existing] = await Promise.all([
      this.prisma.course.findFirst({
        where: { id: courseId, orgId },
        select: { id: true, title: true, status: true },
      }),
      this.prisma.orgMember.findMany({
        where: { orgId, id: { in: [mentorId, menteeId] }, status: { not: 'left' } },
        select: {
          id: true,
          role: true,
          status: true,
          scoutName: true,
          memberCode: true,
          user: { select: { displayName: true, email: true } },
        },
      }),
      this.prisma.mentoringRelationship.findFirst({
        where: { orgId, mentorId, menteeId },
      }),
    ]);

    if (!course) throw new NotFoundException('Course not found');

    const mentor = members.find((member) => member.id === mentorId);
    const mentee = members.find((member) => member.id === menteeId);
    if (!mentor) throw new NotFoundException('Mentor member not found');
    if (!mentee) throw new NotFoundException('Mentee member not found');

    const relationship = existing
      ? await this.prisma.mentoringRelationship.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            startDate: startDate ? new Date(startDate) : (existing.startDate ?? new Date()),
          },
        })
      : await this.prisma.mentoringRelationship.create({
          data: {
            orgId,
            mentorId,
            menteeId,
            startDate: startDate ? new Date(startDate) : new Date(),
            status: 'active',
          },
        });

    const payload = {
      relationshipId: relationship.id,
      courseId,
      courseTitle: course.title,
      mentorId,
      menteeId,
      source: 'lms',
      reusedExisting: Boolean(existing),
    } as unknown as Prisma.InputJsonValue;

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'lms.mentor_assigned',
      resource: 'MentoringRelationship',
      resourceId: relationship.id,
      newValue: payload,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ENRICHMENT.MENTORING_STARTED,
      aggregateId: relationship.id,
      aggregateType: 'MentoringRelationship',
      payload,
      actorUserId,
    });

    return {
      course,
      relationship,
      mentor,
      mentee,
      meta: {
        reusedExisting: Boolean(existing),
        source: 'lms',
      },
    };
  }

  // ── Offline Packs (T-1134) ──

  async generateOfflinePack(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            content: true,
            lessonType: true,
            orderIndex: true,
            duration: true,
            isRequired: true,
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                content: true,
                lessonType: true,
                orderIndex: true,
                duration: true,
                isRequired: true,
              },
            },
          },
        },
        quizzes: {
          include: {
            questions: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Strip correct answers from quiz options for offline display only
    const quizzes = course.quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      passingScore: q.passingScore,
      questions: q.questions.map((qq) => {
        const opts = qq.options as Record<string, unknown>;
        // Remove correctAnswer key from options — grading happens server-side
        const { correctAnswer, ...safeOpts } = opts ?? {};
        return { ...qq, options: safeOpts };
      }),
    }));

    return {
      version: 1,
      courseId: course.id,
      title: course.title,
      description: course.description,
      generatedAt: new Date().toISOString(),
      lessons: course.lessons,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons,
      })),
      quizzes,
      metadata: {
        totalLessons:
          course.lessons.length + course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
        totalQuizzes: course.quizzes.length,
      },
    };
  }

  // ── Bandwidth Guardrails (T-1135) ──

  async estimatePackSize(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId },
      include: {
        lessons: { select: { id: true, content: true } },
        quizzes: { include: { questions: { select: { id: true } } } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Rough estimate: JSON content size
    const contentBytes = course.lessons.reduce((acc, l) => {
      const content = l.content as string | null;
      return acc + (content ? Buffer.byteLength(content, 'utf8') : 0);
    }, 0);

    const questionCount = course.quizzes.reduce((acc, q) => acc + q.questions.length, 0);

    return {
      courseId,
      estimatedSizeBytes: contentBytes + questionCount * 500, // ~500 bytes per question
      estimatedSizeKB: Math.round((contentBytes + questionCount * 500) / 1024),
      lessonCount: course.lessons.length,
      questionCount,
      withinLimit: contentBytes < 5 * 1024 * 1024, // 5MB limit
    };
  }
}
