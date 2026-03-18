import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LmsService } from './lms.service';

interface BattleSocket extends Socket {
  data: {
    orgId?: string;
    userId?: string;
    gameCode?: string;
  };
}

@WebSocketGateway({
  namespace: '/lms-battle',
  cors: { origin: '*' },
})
export class LmsBattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly lmsService: LmsService) {}

  handleConnection(client: BattleSocket) {
    // Auth would normally be handled via middleware/guard
    const orgId = client.handshake.query['orgId'] as string;
    const userId = client.handshake.query['userId'] as string;
    client.data.orgId = orgId;
    client.data.userId = userId;
  }

  handleDisconnect(client: BattleSocket) {
    if (client.data.gameCode) {
      this.server.to(client.data.gameCode).emit('playerLeft', {
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: BattleSocket,
    @MessageBody() data: { gameCode: string },
  ) {
    const { orgId, userId } = client.data;
    if (!orgId || !userId) return { error: 'Not authenticated' };

    try {
      await this.lmsService.joinBattle(orgId, data.gameCode, userId);
      client.join(data.gameCode);
      client.data.gameCode = data.gameCode;

      this.server.to(data.gameCode).emit('playerJoined', { userId });
      return { success: true };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  }

  @SubscribeMessage('startCountdown')
  async handleStartCountdown(
    @ConnectedSocket() client: BattleSocket,
    @MessageBody() data: { gameCode: string },
  ) {
    const { orgId, userId } = client.data;
    if (!orgId || !userId) return { error: 'Not authenticated' };

    try {
      await this.lmsService.startBattle(orgId, data.gameCode, userId);

      // Broadcast countdown then start
      this.server.to(data.gameCode).emit('countdown', { seconds: 3 });

      // Get quiz questions to broadcast
      const battle = await this.lmsService.getBattle(orgId, data.gameCode);
      const questions = battle.quiz?.questions ?? [];

      setTimeout(() => {
        this.server.to(data.gameCode).emit('battleStarted', {
          questions: questions.map((q) => ({
            id: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
          })),
        });
      }, 3000);

      return { success: true };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: BattleSocket,
    @MessageBody() data: { gameCode: string; questionId: string; answer: unknown },
  ) {
    const { orgId, userId } = client.data;
    if (!orgId || !userId) return { error: 'Not authenticated' };

    try {
      const result = await this.lmsService.submitBattleAnswer(orgId, data.gameCode, userId, {
        questionId: data.questionId,
        answer: data.answer,
      });

      // Broadcast updated scores to all players in room
      const scoreboard = await this.lmsService.getBattleScoreboard(orgId, data.gameCode);
      this.server.to(data.gameCode).emit('scoreUpdate', { scoreboard });

      return { success: true, ...result };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  }

  @SubscribeMessage('endBattle')
  async handleEndBattle(
    @ConnectedSocket() client: BattleSocket,
    @MessageBody() data: { gameCode: string },
  ) {
    const { orgId, userId } = client.data;
    if (!orgId || !userId) return { error: 'Not authenticated' };

    try {
      const result = await this.lmsService.finishBattle(orgId, data.gameCode, userId);
      this.server.to(data.gameCode).emit('battleEnd', {
        rankings: result.rankings,
      });
      return { success: true };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  }
}
