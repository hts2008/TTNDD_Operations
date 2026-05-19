import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { LmsService } from './lms.service';

@Controller('lms')
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  // ── Courses ──

  @Post('courses')
  createCourse(@Req() req: any, @Body() body: any) {
    const orgId = req.user?.orgId;
    return this.lmsService.createCourse(orgId, body, req.user?.userId);
  }

  @Get('courses')
  findCourses(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = req.user?.orgId;
    return this.lmsService.findCourses(
      orgId,
      { category, difficulty, status },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('courses/:id')
  findCourseById(@Req() req: any, @Param('id') id: string) {
    return this.lmsService.findCourseById(req.user?.orgId, id);
  }

  @Patch('courses/:id')
  updateCourse(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.lmsService.updateCourse(req.user?.orgId, id, body, req.user?.userId);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCourse(@Req() req: any, @Param('id') id: string) {
    return this.lmsService.deleteCourse(req.user?.orgId, id, req.user?.userId);
  }

  // ── Course Modules ──

  @Post('courses/:courseId/modules')
  createModule(@Req() req: any, @Param('courseId') courseId: string, @Body() body: any) {
    return this.lmsService.createModule(req.user?.orgId, courseId, body);
  }

  @Get('courses/:courseId/modules')
  getModules(@Req() req: any, @Param('courseId') courseId: string) {
    return this.lmsService.getModules(req.user?.orgId, courseId);
  }

  @Patch('modules/:moduleId')
  updateModule(@Req() req: any, @Param('moduleId') moduleId: string, @Body() body: any) {
    return this.lmsService.updateModule(req.user?.orgId, moduleId, body);
  }

  @Delete('modules/:moduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteModule(@Req() req: any, @Param('moduleId') moduleId: string) {
    return this.lmsService.deleteModule(req.user?.orgId, moduleId);
  }

  // ── Lessons ──

  @Post('courses/:courseId/lessons')
  createLesson(@Req() req: any, @Param('courseId') courseId: string, @Body() body: any) {
    return this.lmsService.createLesson(req.user?.orgId, courseId, body);
  }

  @Get('courses/:courseId/lessons')
  getLessons(@Req() req: any, @Param('courseId') courseId: string) {
    return this.lmsService.getLessons(req.user?.orgId, courseId);
  }

  @Patch('lessons/:lessonId')
  updateLesson(@Req() req: any, @Param('lessonId') lessonId: string, @Body() body: any) {
    return this.lmsService.updateLesson(req.user?.orgId, lessonId, body);
  }

  @Delete('lessons/:lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.lmsService.deleteLesson(req.user?.orgId, lessonId);
  }

  // ── Competencies ──

  @Post('competencies')
  createCompetency(@Req() req: any, @Body() body: any) {
    return this.lmsService.createCompetency(req.user?.orgId, body);
  }

  @Get('competencies')
  listCompetencies(@Req() req: any, @Query('category') category?: string) {
    return this.lmsService.listCompetencies(req.user?.orgId, category);
  }

  @Post('courses/:courseId/competencies')
  mapCompetency(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body('competencyId') competencyId: string,
  ) {
    return this.lmsService.mapCompetencyToCourse(
      req.user?.orgId,
      courseId,
      competencyId,
      req.user?.userId,
    );
  }

  // ── Completion Rules ──

  @Post('courses/:courseId/completion-rules')
  addCompletionRule(@Req() req: any, @Param('courseId') courseId: string, @Body() body: any) {
    return this.lmsService.addCompletionRule(req.user?.orgId, courseId, body);
  }

  @Get('courses/:courseId/completion-check/:memberId')
  checkCompletion(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.lmsService.checkCompletionRules(req.user?.orgId, courseId, memberId);
  }

  // ── Quizzes ──

  @Post('quizzes')
  createQuiz(@Req() req: any, @Body() body: any) {
    return this.lmsService.createQuiz(req.user?.orgId, body, req.user?.userId);
  }

  @Get('quizzes')
  getQuizzes(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.lmsService.getQuizzes(
      req.user?.orgId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('quizzes/:id')
  getQuizById(@Req() req: any, @Param('id') id: string) {
    return this.lmsService.getQuizById(req.user?.orgId, id);
  }

  @Get('quizzes/:id/public')
  getQuizPublic(@Req() req: any, @Param('id') id: string) {
    return this.lmsService.getQuizPublic(req.user?.orgId, id);
  }

  // ── Quiz Questions ──

  @Post('quizzes/:quizId/questions')
  createQuestion(@Req() req: any, @Param('quizId') quizId: string, @Body() body: any) {
    return this.lmsService.createQuestion(req.user?.orgId, quizId, body);
  }

  @Get('quizzes/:quizId/questions')
  getQuestions(@Req() req: any, @Param('quizId') quizId: string) {
    return this.lmsService.getQuestions(req.user?.orgId, quizId);
  }

  // ── Quiz Attempts ──

  @Post('quizzes/:quizId/attempts/start')
  startAttempt(
    @Req() req: any,
    @Param('quizId') quizId: string,
    @Body('memberId') memberId: string,
  ) {
    return this.lmsService.startQuizAttempt(req.user?.orgId, quizId, memberId, req.user?.userId);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(
    @Req() req: any,
    @Param('attemptId') attemptId: string,
    @Body('answers') answers: any[],
  ) {
    return this.lmsService.submitQuizAttempt(req.user?.orgId, attemptId, answers, req.user?.userId);
  }

  @Get('quizzes/:quizId/attempts/:memberId')
  getAttemptHistory(
    @Req() req: any,
    @Param('quizId') quizId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.lmsService.getAttemptHistory(req.user?.orgId, quizId, memberId);
  }

  // ── Grading Queue ──

  @Get('grading-queue')
  getGradingQueue(@Req() req: any) {
    return this.lmsService.getGradingQueue(req.user?.orgId);
  }

  @Post('attempts/:attemptId/grade')
  gradeAttempt(@Req() req: any, @Param('attemptId') attemptId: string, @Body() body: any) {
    return this.lmsService.gradeAttempt(req.user?.orgId, attemptId, body, req.user?.userId);
  }

  // ── Quiz Battles ──

  @Post('quizzes/:quizId/battles')
  createBattle(
    @Req() req: any,
    @Param('quizId') quizId: string,
    @Body('maxPlayers') maxPlayers?: number,
  ) {
    return this.lmsService.createBattle(req.user?.orgId, quizId, req.user?.userId, maxPlayers);
  }

  @Post('battles/:gameCode/join')
  joinBattle(@Req() req: any, @Param('gameCode') gameCode: string) {
    return this.lmsService.joinBattle(req.user?.orgId, gameCode, req.user?.userId);
  }

  @Get('battles/:gameCode')
  getBattle(@Req() req: any, @Param('gameCode') gameCode: string) {
    return this.lmsService.getBattle(req.user?.orgId, gameCode);
  }

  @Post('battles/:gameCode/start')
  startBattle(@Req() req: any, @Param('gameCode') gameCode: string) {
    return this.lmsService.startBattle(req.user?.orgId, gameCode, req.user?.userId);
  }

  @Post('battles/:gameCode/answer')
  submitBattleAnswer(@Req() req: any, @Param('gameCode') gameCode: string, @Body() body: any) {
    return this.lmsService.submitBattleAnswer(req.user?.orgId, gameCode, req.user?.userId, body);
  }

  @Post('battles/:gameCode/finish')
  finishBattle(@Req() req: any, @Param('gameCode') gameCode: string) {
    return this.lmsService.finishBattle(req.user?.orgId, gameCode, req.user?.userId);
  }

  @Get('battles/:gameCode/scoreboard')
  getBattleScoreboard(@Req() req: any, @Param('gameCode') gameCode: string) {
    return this.lmsService.getBattleScoreboard(req.user?.orgId, gameCode);
  }

  // ── Course Progress ──

  @Post('courses/:courseId/enroll')
  startCourse(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body('memberId') memberId: string,
  ) {
    return this.lmsService.startCourse(req.user?.orgId, memberId, courseId, req.user?.userId);
  }

  @Post('lessons/:lessonId/complete')
  completeLesson(
    @Req() req: any,
    @Param('lessonId') lessonId: string,
    @Body('memberId') memberId: string,
  ) {
    return this.lmsService.completeLesson(req.user?.orgId, memberId, lessonId, req.user?.userId);
  }

  @Get('progress/:memberId')
  getProgress(@Req() req: any, @Param('memberId') memberId: string) {
    return this.lmsService.getProgress(req.user?.orgId, memberId);
  }

  @Post('courses/:courseId/mentors')
  assignMentor(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body() body: { mentorId: string; menteeId: string; startDate?: string },
  ) {
    return this.lmsService.assignMentor(
      req.user?.orgId,
      courseId,
      body.mentorId,
      body.menteeId,
      req.user?.userId,
      body.startDate,
    );
  }

  // ── Offline Packs ──

  @Get('courses/:courseId/offline-pack')
  getOfflinePack(@Req() req: any, @Param('courseId') courseId: string) {
    return this.lmsService.generateOfflinePack(req.user?.orgId, courseId);
  }

  @Get('courses/:courseId/pack-size')
  getPackSize(@Req() req: any, @Param('courseId') courseId: string) {
    return this.lmsService.estimatePackSize(req.user?.orgId, courseId);
  }
}
