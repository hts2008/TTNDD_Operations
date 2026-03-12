import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Socket } from 'socket.io';
import { PrismaService } from '../core/database';

export interface WsUser {
  userId: string;
  orgId: string;
  role: string;
  memberId?: string;
  firebaseUid: string;
}

/**
 * WebSocket authentication guard — validates Firebase JWT token
 * passed in the Socket.IO handshake `auth.token` field.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);
  private initialized = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private ensureFirebase() {
    if (this.initialized) return;
    if (!admin.apps.length) {
      const projectId = this.config.get('GOOGLE_CLOUD_PROJECT');
      if (projectId) {
        admin.initializeApp({ projectId });
        this.logger.log(`Firebase Admin initialized (gateway) for project: ${projectId}`);
      } else {
        this.logger.warn('GOOGLE_CLOUD_PROJECT not set — using DEV mode');
      }
    }
    this.initialized = true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.ensureFirebase();

    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = client.handshake?.auth?.token as string;

    if (!token) {
      this.logger.warn(`WS connection rejected — no auth token`);
      client.disconnect(true);
      return false;
    }

    const isDev = this.config.get('APP_ENV') === 'development';

    try {
      let firebaseUid: string;

      if (isDev && token.startsWith('dev:')) {
        firebaseUid = token.replace('dev:', '');
      } else if (!admin.apps.length) {
        this.logger.warn('Firebase not initialized — rejecting connection');
        client.disconnect(true);
        return false;
      } else {
        const decoded = await admin.auth().verifyIdToken(token);
        firebaseUid = decoded.uid;
      }

      // Resolve user + org membership
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid },
        include: { orgMembers: { where: { status: 'active' }, take: 1 } },
      });

      if (!user || !user.orgMembers[0]) {
        this.logger.warn(`WS auth failed — user not found for uid: ${firebaseUid}`);
        client.disconnect(true);
        return false;
      }

      const member = user.orgMembers[0];
      const wsUser: WsUser = {
        userId: user.id,
        orgId: member.orgId,
        role: member.role,
        memberId: member.id,
        firebaseUid: user.firebaseUid,
      };

      // Attach user data to socket for downstream access
      (client as Socket & { data: { user: WsUser } }).data = { user: wsUser };
      return true;
    } catch (error) {
      this.logger.warn(`WS auth error: ${(error as Error).message}`);
      client.disconnect(true);
      return false;
    }
  }
}
