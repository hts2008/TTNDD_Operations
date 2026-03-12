import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../core/database';
import { WsAuthGuard, WsUser } from '../guards/ws-auth.guard';
import { DOMAIN_EVENTS } from '@ttndd/constants';

interface BattleAnswerPayload {
  gameCode: string;
  questionId: string;
  selectedAnswer: Prisma.InputJsonValue;
  elapsedMs: number;
}

@WebSocketGateway({
  namespace: '/battle',
  cors: { origin: '*', credentials: true },
})
@UseGuards(WsAuthGuard)
export class BattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(BattleGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private getUser(client: Socket): WsUser {
    return (client as Socket & { data: { user: WsUser } }).data.user;
  }

  // ── battle:join — Player joins a battle room ──

  @SubscribeMessage('battle:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string },
  ) {
    const user = this.getUser(client);

    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode: data.gameCode, orgId: user.orgId, status: { in: ['waiting', 'active'] } },
    });

    if (!battle) {
      client.emit('battle:error', { message: 'Battle not found or already finished' });
      return;
    }

    // Check max players
    const results = (battle.results as Record<string, unknown>) ?? {};
    const org = await this.prisma.organization.findUnique({
      where: { id: user.orgId },
      select: { settings: true },
    });
    const settings = ((org?.settings as Record<string, unknown>) ?? {});
    const budgetMode = settings['battle.budgetMode'] === true;
    const maxPlayers = typeof settings['battle.maxPlayers'] === 'number'
      ? settings['battle.maxPlayers'] as number
      : budgetMode ? 15 : 30;

    if (Object.keys(results).length >= maxPlayers && !results[user.userId]) {
      client.emit('battle:error', { message: 'Battle room is full' });
      return;
    }

    // Add player to results if not already joined
    if (!results[user.userId]) {
      results[user.userId] = { score: 0, joinedAt: new Date().toISOString() };
      await this.prisma.quizBattle.update({
        where: { id: battle.id },
        data: { results: results as unknown as Prisma.InputJsonValue },
      });
    }

    // Join Socket.IO room
    await client.join(`battle:${data.gameCode}`);
    this.logger.log(`User ${user.userId} joined battle ${data.gameCode}`);

    // Notify room
    this.server.to(`battle:${data.gameCode}`).emit('battle:player-joined', {
      userId: user.userId,
      playerCount: Object.keys(results).length,
    });

    // Send current state to joiner
    client.emit('battle:state', {
      gameCode: data.gameCode,
      status: battle.status,
      currentQuestion: battle.currentQuestion,
      playerCount: Object.keys(results).length,
    });
  }

  // ── battle:start — Host starts the battle ──

  @SubscribeMessage('battle:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string },
  ) {
    const user = this.getUser(client);

    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode: data.gameCode, orgId: user.orgId, status: 'waiting' },
      include: { quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
    });

    if (!battle) {
      client.emit('battle:error', { message: 'Battle not found or already started' });
      return;
    }

    if (battle.hostId !== user.userId) {
      client.emit('battle:error', { message: 'Only the host can start' });
      return;
    }

    const updated = await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { status: 'active', startedAt: new Date(), currentQuestion: 0 },
    });

    const firstQuestion = battle.quiz.questions[0];

    // Broadcast to room
    this.server.to(`battle:${data.gameCode}`).emit('battle:started', {
      totalQuestions: battle.quiz.questions.length,
      currentQuestion: 0,
      question: firstQuestion ? {
        id: firstQuestion.id,
        questionText: firstQuestion.questionText,
        questionType: firstQuestion.questionType,
        options: firstQuestion.options,
        timeLimit: firstQuestion.timeLimit ?? battle.quiz.timeLimit ?? 30,
        points: firstQuestion.points,
      } : null,
    });

    this.logger.log(`Battle ${data.gameCode} started by host ${user.userId}`);
  }

  // ── battle:answer — Submit answer with time-bonus scoring ──

  @SubscribeMessage('battle:answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: BattleAnswerPayload,
  ) {
    const user = this.getUser(client);

    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode: data.gameCode, orgId: user.orgId, status: 'active' },
      include: { quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
    });

    if (!battle) {
      client.emit('battle:error', { message: 'Active battle not found' });
      return;
    }

    const question = battle.quiz.questions.find((q) => q.id === data.questionId);
    if (!question) {
      client.emit('battle:error', { message: 'Question not found' });
      return;
    }

    // Validate current question
    const currentQ = battle.quiz.questions[battle.currentQuestion];
    if (!currentQ || currentQ.id !== data.questionId) {
      client.emit('battle:error', { message: 'Not the current question' });
      return;
    }

    // Check correctness
    const correct = JSON.stringify(question.correctAnswer) === JSON.stringify(data.selectedAnswer);

    // Time-bonus: basePoints * (0.5 + 0.5 * max(0, 1 - elapsed/timeLimit))
    const timeLimitMs = (question.timeLimit ?? battle.quiz.timeLimit ?? 30) * 1000;
    const timeBonus = Math.max(0, 1 - data.elapsedMs / timeLimitMs);
    const earnedPoints = correct ? Math.round(question.points * (0.5 + 0.5 * timeBonus)) : 0;

    // Update player results
    const results = (battle.results as Record<string, Record<string, unknown>>) ?? {};
    const playerData = results[user.userId] ?? { score: 0 };
    playerData.score = (Number(playerData.score) || 0) + earnedPoints;
    playerData[`q_${data.questionId}`] = {
      correct, earnedPoints, elapsedMs: data.elapsedMs,
    };
    results[user.userId] = playerData;

    await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { results: results as unknown as Prisma.InputJsonValue },
    });

    // Respond to player
    client.emit('battle:answer-result', { correct, earnedPoints, totalScore: playerData.score });

    // ── T-0124: Broadcast live leaderboard ──
    const leaderboard = Object.entries(results)
      .map(([playerId, d]) => ({ playerId, score: Number(d.score) || 0 }))
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    this.server.to(`battle:${data.gameCode}`).emit('battle:leaderboard', {
      leaderboard,
      answeredCount: Object.keys(results).filter(
        (pid) => results[pid]?.[`q_${data.questionId}`] !== undefined,
      ).length,
      totalPlayers: Object.keys(results).length,
    });
  }

  // ── battle:advance — Host advances to next question ──

  @SubscribeMessage('battle:advance')
  async handleAdvance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string },
  ) {
    const user = this.getUser(client);

    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode: data.gameCode, orgId: user.orgId, status: 'active' },
      include: { quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
    });

    if (!battle) {
      client.emit('battle:error', { message: 'Active battle not found' });
      return;
    }
    if (battle.hostId !== user.userId) {
      client.emit('battle:error', { message: 'Only the host can advance' });
      return;
    }

    const nextQ = battle.currentQuestion + 1;
    if (nextQ >= battle.quiz.questions.length) {
      client.emit('battle:error', { message: 'No more questions — end the battle' });
      return;
    }

    await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: { currentQuestion: nextQ },
    });

    const question = battle.quiz.questions[nextQ];
    if (!question) {
      client.emit('battle:error', { message: 'Question not found at index' });
      return;
    }

    // Broadcast new question to all players
    this.server.to(`battle:${data.gameCode}`).emit('battle:next-question', {
      currentQuestion: nextQ,
      totalQuestions: battle.quiz.questions.length,
      question: {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        timeLimit: question.timeLimit ?? battle.quiz.timeLimit ?? 30,
        points: question.points,
      },
    });
  }

  // ── battle:end — Host ends battle, broadcast final rankings ──

  @SubscribeMessage('battle:end')
  async handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string },
  ) {
    const user = this.getUser(client);

    const battle = await this.prisma.quizBattle.findFirst({
      where: { gameCode: data.gameCode, orgId: user.orgId, status: 'active' },
    });

    if (!battle) {
      client.emit('battle:error', { message: 'Active battle not found' });
      return;
    }
    if (battle.hostId !== user.userId) {
      client.emit('battle:error', { message: 'Only the host can end' });
      return;
    }

    // Compute final rankings
    const results = (battle.results as Record<string, { score?: number }>) ?? {};
    const rankings = Object.entries(results)
      .map(([playerId, d]) => ({ playerId, score: d.score ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    await this.prisma.quizBattle.update({
      where: { id: battle.id },
      data: {
        status: 'finished',
        endedAt: new Date(),
        results: { ...(results as Record<string, unknown>), _rankings: rankings } as unknown as Prisma.InputJsonValue,
      },
    });

    // ── T-0124: Broadcast final leaderboard ──
    this.server.to(`battle:${data.gameCode}`).emit('battle:ended', {
      rankings,
      winner: rankings[0] ?? null,
    });

    this.logger.log(`Battle ${data.gameCode} ended. Winner: ${rankings[0]?.playerId}`);
  }
}
