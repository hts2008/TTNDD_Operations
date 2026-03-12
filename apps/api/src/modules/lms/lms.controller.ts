import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { LmsService } from './lms.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('LMS')
@ApiBearerAuth()
@Controller('lms')
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  // ── Courses ──

  @Post('courses')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new course' })
  createCourse(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      title: string; description?: string; coverImageUrl?: string;
      category?: string; difficulty?: string; targetBranches?: string[];
      isPublic?: boolean; expReward?: number; totalDuration?: number;
    },
  ) {
    return this.lmsService.createCourse(user.orgId, body, user.userId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'List courses (paginated, filterable)' })
  findCourses(
    @CurrentUser() user: CurrentUserPayload,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.lmsService.findCourses(user.orgId, { category, difficulty, status }, page ?? 1, limit ?? 20);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course detail with lessons and quizzes' })
  findCourseById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.lmsService.findCourseById(user.orgId, id);
  }

  // ── Lessons ──

  @Post('courses/:id/lessons')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Add a lesson to a course' })
  createLesson(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') courseId: string,
    @Body() body: {
      title: string; orderIndex?: number; lessonType?: string;
      content?: Prisma.InputJsonValue; videoUrl?: string;
      duration?: number; expReward?: number; isRequired?: boolean;
    },
  ) {
    return this.lmsService.createLesson(user.orgId, courseId, body);
  }

  @Get('courses/:id/lessons')
  @ApiOperation({ summary: 'List lessons for a course' })
  getLessons(@CurrentUser() user: CurrentUserPayload, @Param('id') courseId: string) {
    return this.lmsService.getLessons(user.orgId, courseId);
  }

  // ── Quizzes ──

  @Post('quizzes')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a quiz' })
  createQuiz(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      title: string; description?: string; quizType?: string;
      timeLimit?: number; passingScore?: number; randomizeQ?: boolean;
      maxRetries?: number; courseId?: string; expReward?: number;
    },
  ) {
    return this.lmsService.createQuiz(user.orgId, body, user.userId);
  }

  @Get('quizzes')
  @ApiOperation({ summary: 'List quizzes (paginated)' })
  getQuizzes(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.lmsService.getQuizzes(user.orgId, page ?? 1, limit ?? 20);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get quiz with questions' })
  getQuizById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.lmsService.getQuizById(user.orgId, id);
  }

  @Post('quizzes/:id/questions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Add a question to a quiz' })
  createQuestion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') quizId: string,
    @Body() body: {
      questionText: string; questionType?: string;
      options: Prisma.InputJsonValue; correctAnswer?: Prisma.InputJsonValue;
      explanation?: string; points?: number; timeLimit?: number;
      mediaUrl?: string; orderIndex?: number;
    },
  ) {
    return this.lmsService.createQuestion(user.orgId, quizId, body);
  }

  @Post('quizzes/:id/attempt')
  @ApiOperation({ summary: 'Submit quiz attempt (auto-graded)' })
  submitQuizAttempt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') quizId: string,
    @Body() body: {
      answers: Array<{ questionId: string; selectedAnswer: Prisma.InputJsonValue }>;
    },
  ) {
    return this.lmsService.submitQuizAttempt(
      user.orgId, quizId, user.memberId ?? user.userId, body.answers, user.userId,
    );
  }

  // ── Battle Arena ──

  @Post('battles')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a quiz battle room' })
  createBattle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { quizId: string; maxPlayers?: number },
  ) {
    return this.lmsService.createBattle(user.orgId, body.quizId, user.userId, body.maxPlayers);
  }

  @Get('battles/:gameCode')
  @ApiOperation({ summary: 'Get battle by game code' })
  getBattle(@CurrentUser() user: CurrentUserPayload, @Param('gameCode') gameCode: string) {
    return this.lmsService.getBattle(user.orgId, gameCode);
  }

  @Post('battles/:gameCode/start')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Host starts the battle (T-0121)' })
  startBattle(@CurrentUser() user: CurrentUserPayload, @Param('gameCode') gameCode: string) {
    return this.lmsService.startBattle(user.orgId, gameCode, user.userId);
  }

  @Post('battles/:gameCode/answer')
  @ApiOperation({ summary: 'Submit answer with time-bonus scoring (T-0123)' })
  submitBattleAnswer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('gameCode') gameCode: string,
    @Body() body: { questionId: string; selectedAnswer: Prisma.InputJsonValue; elapsedMs: number },
  ) {
    return this.lmsService.submitBattleAnswer(user.orgId, gameCode, user.userId, body);
  }

  @Post('battles/:gameCode/advance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Advance to next question (T-0123)' })
  advanceQuestion(@CurrentUser() user: CurrentUserPayload, @Param('gameCode') gameCode: string) {
    return this.lmsService.advanceQuestion(user.orgId, gameCode, user.userId);
  }

  @Post('battles/:gameCode/end')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'End battle and compute rankings (T-0121)' })
  endBattle(@CurrentUser() user: CurrentUserPayload, @Param('gameCode') gameCode: string) {
    return this.lmsService.endBattle(user.orgId, gameCode, user.userId);
  }

  @Get('battles/config')
  @ApiOperation({ summary: 'Get battle config / budget limits (T-0125)' })
  getBattleConfig(@CurrentUser() user: CurrentUserPayload) {
    return this.lmsService.getBattleConfig(user.orgId);
  }

  // ── Progress ──

  @Post('courses/:id/enroll')
  @ApiOperation({ summary: 'Enroll / start a course' })
  startCourse(@CurrentUser() user: CurrentUserPayload, @Param('id') courseId: string) {
    return this.lmsService.startCourse(
      user.orgId, user.memberId ?? user.userId, courseId, user.userId,
    );
  }

  @Get('progress/:memberId')
  @ApiOperation({ summary: 'Get course progress for a member' })
  getProgress(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.lmsService.getProgress(user.orgId, memberId);
  }

  // ── Assignments ──

  @Post('courses/:id/assignments')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Assign a course to a member' })
  createAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') courseId: string,
    @Body() body: { orgMemberId: string; dueDate?: Date },
  ) {
    return this.lmsService.createAssignment(user.orgId, courseId, body, user.userId);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'List assignments (filterable)' })
  getAssignments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('courseId') courseId?: string,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.lmsService.getAssignments(user.orgId, { courseId, memberId, status }, page ?? 1, limit ?? 20);
  }

  @Post('assignments/:id/submit')
  @ApiOperation({ summary: 'Submit assignment work' })
  submitAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { content: Prisma.InputJsonValue },
  ) {
    return this.lmsService.submitAssignment(user.orgId, id, body.content);
  }

  @Post('assignments/:id/grade')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Grade a submitted assignment' })
  gradeAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { grade: number; feedback?: string },
  ) {
    return this.lmsService.gradeAssignment(user.orgId, id, body, user.userId);
  }

  // ── Mentor Grading Queue ──

  @Get('mentor/queue')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get pending quiz attempts for mentor review' })
  getMentorQueue(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.lmsService.getMentorQueue(user.orgId, page ?? 1, limit ?? 20);
  }

  @Post('attempts/:id/grade')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Grade a pending quiz attempt (essay/manual)' })
  gradeAttempt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { score: number; feedback?: string },
  ) {
    return this.lmsService.gradeAttempt(user.orgId, id, body, user.userId);
  }

  // ── Gradebook ──

  @Get('gradebook/:memberId')
  @ApiOperation({ summary: 'Get full gradebook for a member' })
  getGradebook(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.lmsService.getGradebook(user.orgId, memberId);
  }

  // ── WP-4.5: Parent Learning Dashboard & Mentor-Advisor ──

  @Get('parent/learning')
  @ApiOperation({ summary: 'Parent views children learning progress (T-0126)' })
  getParentLearningView(@CurrentUser() user: CurrentUserPayload) {
    return this.lmsService.getParentLearningView(user.orgId, user.userId);
  }

  @Get('mentor/scope')
  @ApiOperation({ summary: 'Mentor views assigned mentees progress (T-0127)' })
  getMentorScopedView(
    @CurrentUser() user: CurrentUserPayload,
    @Query('mentorMemberId') mentorMemberId: string,
  ) {
    return this.lmsService.getMentorScopedView(user.orgId, mentorMemberId, user.userId);
  }

  @Get('evidence-links/:memberId')
  @ApiOperation({ summary: 'Evidence-to-course cross-reference for a member (T-0128)' })
  getEvidenceCourseLinkage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.lmsService.getEvidenceCourseLinkage(user.orgId, memberId);
  }

  @Post('notifications/learning')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Trigger parent learning notification (T-0129, internal)' })
  emitLearningNotification(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { memberId: string; eventType: string; courseTitle?: string; quizTitle?: string; score?: number },
  ) {
    return this.lmsService.emitLearningNotification(user.orgId, body.memberId, body.eventType, body);
  }

  // ── WP-4.3: Offline Packs & PWA Sync (T-0117) ──

  @Get('offline-packs/:courseId')
  @ApiOperation({ summary: 'Get offline pack manifest for a course (T-0117)' })
  getOfflinePack(
    @CurrentUser() user: CurrentUserPayload,
    @Param('courseId') courseId: string,
  ) {
    return this.lmsService.getOfflinePack(user.orgId, courseId);
  }

  @Post('offline-packs/sync')
  @ApiOperation({ summary: 'Sync queued offline results back to server (T-0117)' })
  syncOfflineResults(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { results: Array<{ type: 'quiz_attempt' | 'checklist_completion'; entityId: string; data: Record<string, unknown>; clientTimestamp: string }> },
  ) {
    return this.lmsService.syncOfflineResults(user.orgId, user.userId, body.results);
  }
}
