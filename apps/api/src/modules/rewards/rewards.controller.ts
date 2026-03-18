import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { ExpService } from './exp.service';
import { BadgeService } from './badge.service';
import { RewardShopService } from './reward-shop.service';
import { PenaltyService } from './penalty.service';
import { LeaderboardService } from './leaderboard.service';
import { PeerRecognitionService } from './peer-recognition.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Rewards')
@ApiBearerAuth()
@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly expService: ExpService,
    private readonly badgeService: BadgeService,
    private readonly shopService: RewardShopService,
    private readonly penaltyService: PenaltyService,
    private readonly leaderboardService: LeaderboardService,
    private readonly peerRecognitionService: PeerRecognitionService,
  ) {}

  // ── EXP Config ──

  @Get('exp/configs')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List EXP config rules' })
  getExpConfigs(@CurrentUser() user: CurrentUserPayload) {
    return this.expService.getConfigs(user.orgId);
  }

  @Post('exp/configs')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Upsert EXP config rule' })
  upsertExpConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      eventType: string;
      sourceModule: string;
      actionName: string;
      expAmount: number;
      maxPerDay?: number;
      maxPerWeek?: number;
      description?: string;
    },
  ) {
    return this.expService.upsertConfig(user.orgId, body);
  }

  // ── EXP Awards ──

  @Post('exp/award')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Manually award EXP to a member' })
  awardExp(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { memberId: string; amount: number; notes?: string },
  ) {
    return this.expService.awardExp(
      user.orgId,
      body.memberId,
      body.amount,
      'manual_award',
      'admin',
      undefined,
      user.userId,
      body.notes,
    );
  }

  @Post('exp/deduct')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Deduct EXP from a member (penalty)' })
  deductExp(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { memberId: string; amount: number; reason: string },
  ) {
    return this.expService.deductExp(
      user.orgId,
      body.memberId,
      body.amount,
      body.reason,
      user.userId,
    );
  }

  // ── EXP Member View ──

  @Get('exp/summary/:memberId')
  @ApiOperation({ summary: 'Get member EXP summary' })
  getSummary(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.expService.getSummary(user.orgId, memberId);
  }

  @Get('exp/transactions/:memberId')
  @ApiOperation({ summary: 'Get member EXP transaction history' })
  getTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.expService.getTransactions(user.orgId, memberId, page ?? 1, limit ?? 20);
  }

  // ── Penalties (G3) ──

  @Post('penalties')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Apply a penalty (deduct EXP with metadata)' })
  applyPenalty(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      memberId: string;
      amount: number;
      reason: string;
      deductionItem?: string;
      correctionTask?: string;
    },
  ) {
    return this.penaltyService.applyPenalty(
      user.orgId,
      body.memberId,
      body.amount,
      body.reason,
      user.userId,
      body.deductionItem,
      body.correctionTask,
    );
  }

  @Post('penalties/:id/correct')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Correct (reverse) a penalty' })
  correctPenalty(@CurrentUser() user: CurrentUserPayload, @Param('id') penaltyTxId: string) {
    return this.penaltyService.correctPenalty(user.orgId, penaltyTxId, user.userId);
  }

  // ── Leaderboard (G6) ──

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get EXP leaderboard with scope filtering' })
  getLeaderboard(
    @CurrentUser() user: CurrentUserPayload,
    @Query('scope') scope?: string,
    @Query('scopeId') scopeId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getLive(user.orgId, scope ?? 'org', scopeId, limit ?? 20);
  }

  @Get('leaderboard/snapshots')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get historical leaderboard snapshots' })
  getLeaderboardSnapshots(
    @CurrentUser() user: CurrentUserPayload,
    @Query('scope') scope?: string,
    @Query('period') period?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getSnapshots(
      user.orgId,
      scope ?? 'org',
      period,
      page ?? 1,
      limit ?? 10,
    );
  }

  @Post('leaderboard/snapshot')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Take a leaderboard snapshot' })
  takeLeaderboardSnapshot(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { scope?: string; scopeId?: string; period?: string },
  ) {
    return this.leaderboardService.takeSnapshot(user.orgId, body.scope, body.scopeId, body.period);
  }

  // ── Peer Recognition (G5) ──

  @Post('peer-recognition')
  @ApiOperation({ summary: 'Give recognition to a peer' })
  givePeerRecognition(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { toMemberId: string; category: string; message?: string },
  ) {
    return this.peerRecognitionService.give(
      user.orgId,
      user.memberId!,
      body.toMemberId,
      body.category,
      body.message,
    );
  }

  @Get('peer-recognition/received/:memberId')
  @ApiOperation({ summary: 'Get recognitions received by a member' })
  getPeerRecognitionsReceived(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.peerRecognitionService.getReceived(user.orgId, memberId, page ?? 1, limit ?? 20);
  }

  // ── Badges ──

  @Get('badges/definitions')
  @ApiOperation({ summary: 'List badge definitions' })
  getBadgeDefinitions(@CurrentUser() user: CurrentUserPayload) {
    return this.badgeService.getDefinitions(user.orgId);
  }

  @Post('badges/definitions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create badge definition' })
  createBadgeDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      badgeCode: string;
      name: string;
      description?: string;
      badgeType?: string;
      imageUrl: string;
      rarity?: string;
      triggerEvent?: string;
      triggerConfig?: Prisma.InputJsonValue;
      expReward?: number;
      isAutoAward?: boolean;
    },
  ) {
    return this.badgeService.createDefinition(user.orgId, body);
  }

  @Post('badges/award')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Manually award badge' })
  awardBadge(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { memberId: string; badgeId: string; notes?: string },
  ) {
    return this.badgeService.awardBadge(
      user.orgId,
      body.memberId,
      body.badgeId,
      undefined,
      body.notes,
      user.userId,
    );
  }

  @Get('badges/member/:memberId')
  @ApiOperation({ summary: 'Get member badges' })
  getMemberBadges(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.badgeService.getMemberBadges(user.orgId, memberId);
  }

  // ── Shop ──

  @Get('shop/items')
  @ApiOperation({ summary: 'List shop items' })
  getShopItems(@CurrentUser() user: CurrentUserPayload) {
    return this.shopService.getItems(user.orgId);
  }

  @Post('shop/items')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create shop item' })
  createShopItem(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      costExp: number;
      category?: string;
      imageUrl?: string;
      quantityAvailable?: number;
      validUntil?: string;
    },
  ) {
    return this.shopService.createItem(user.orgId, body);
  }

  @Post('shop/redeem')
  @ApiOperation({ summary: 'Redeem a shop item (spend EXP)' })
  redeem(@CurrentUser() user: CurrentUserPayload, @Body() body: { rewardId: string }) {
    return this.shopService.redeem(user.orgId, user.memberId!, body.rewardId);
  }

  @Post('shop/redemptions/:id/approve')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Approve a redemption' })
  approveRedemption(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.shopService.approveRedemption(user.orgId, id, user.userId);
  }

  @Get('shop/my-redemptions')
  @ApiOperation({ summary: 'Get my redemptions' })
  getMyRedemptions(@CurrentUser() user: CurrentUserPayload) {
    return this.shopService.getMyRedemptions(user.orgId, user.memberId!);
  }
}
