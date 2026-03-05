import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../database';
import type { CurrentUserPayload } from '../../common/decorators';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    if (!admin.apps.length) {
      const projectId = this.config.get('GOOGLE_CLOUD_PROJECT');
      if (projectId) {
        admin.initializeApp({
          projectId,
        });
        this.logger.log(`Firebase Admin initialized for project: ${projectId}`);
      } else {
        this.logger.warn(
          'GOOGLE_CLOUD_PROJECT not set — Firebase token verification disabled (DEV mode)',
        );
      }
    }
  }

  /**
   * Verify Firebase ID token. In DEV mode without Firebase config,
   * accepts a mock header for local development.
   */
  async verifyToken(token: string): Promise<CurrentUserPayload | null> {
    const isDev = this.config.get('APP_ENV') === 'development';

    if (isDev && token.startsWith('dev:')) {
      return this.handleDevToken(token);
    }

    if (!admin.apps.length) {
      this.logger.warn('Firebase not initialized — rejecting token');
      return null;
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return this.resolveUser(decoded.uid);
    } catch (error) {
      this.logger.warn(`Token verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * DEV-only: parse mock token format "dev:<firebaseUid>"
   * for local testing without Firebase.
   */
  private async handleDevToken(token: string): Promise<CurrentUserPayload | null> {
    const firebaseUid = token.replace('dev:', '');
    return this.resolveUser(firebaseUid);
  }

  private async resolveUser(firebaseUid: string): Promise<CurrentUserPayload | null> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        orgMembers: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    if (!user || !user.orgMembers[0]) return null;

    const member = user.orgMembers[0];
    return {
      userId: user.id,
      orgId: member.orgId,
      role: member.role,
      email: user.email ?? undefined,
      firebaseUid: user.firebaseUid,
    };
  }
}
