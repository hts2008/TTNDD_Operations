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
}
