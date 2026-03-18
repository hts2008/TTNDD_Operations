import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { AuthService } from './auth.service';
import { PrismaService } from '../database';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /auth/login
   * Accepts { email, password } and returns { user, token }.
   *
   * - In PRODUCTION: Uses Firebase Auth REST API (signInWithEmailAndPassword)
   *   to authenticate, then verifies the resulting ID token server-side.
   * - In DEV mode (APP_ENV=development): Looks up user by email and returns
   *   a dev token for local testing without Firebase.
   */
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with email/password' })
  async login(@Body() body: { email: string; password: string }) {
    const isDev = this.config.get('APP_ENV') === 'development';

    if (isDev) {
      return this.devLogin(body.email);
    }

    // Production: Use Firebase Auth REST API
    const apiKey = this.config.get('FIREBASE_API_KEY');
    if (!apiKey) {
      throw new UnauthorizedException(
        'FIREBASE_API_KEY not configured. Set APP_ENV=development for dev mode.',
      );
    }

    try {
      // Call Firebase Auth REST API to sign in
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: body.email,
            password: body.password,
            returnSecureToken: true,
          }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: { message?: string } };
        const msg = errorData?.error?.message || 'Authentication failed';
        this.logger.warn(`Firebase Auth failed: ${msg}`);
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      }

      const firebaseResult = (await response.json()) as { idToken: string; localId: string };

      // Verify the ID token server-side and resolve user
      const payload = await this.authService.verifyToken(firebaseResult.idToken);
      if (!payload) {
        throw new UnauthorizedException('Không tìm thấy tài khoản trong hệ thống');
      }

      return {
        user: payload,
        token: firebaseResult.idToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Login error: ${(error as Error).message}`);
      throw new UnauthorizedException('Đăng nhập thất bại');
    }
  }

  /**
   * DEV-only login: look up user by email, return dev token.
   */
  private async devLogin(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        orgMembers: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    if (!user || !user.orgMembers[0]) {
      throw new UnauthorizedException('Không tìm thấy tài khoản: ' + email);
    }

    const member = user.orgMembers[0];
    return {
      user: {
        userId: user.id,
        orgId: member.orgId,
        role: member.role,
        email: user.email,
        memberId: member.id,
        firebaseUid: user.firebaseUid,
      },
      token: `dev:${user.firebaseUid}`,
    };
  }

  /**
   * GET /auth/me — returns current authenticated user info.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    return { user };
  }
}
