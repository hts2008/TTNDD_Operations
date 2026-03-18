import { Module } from '@nestjs/common';
import { RewardsController } from './rewards.controller';
import { ExpService } from './exp.service';
import { BadgeService } from './badge.service';
import { RewardShopService } from './reward-shop.service';
import { RewardEventSubscriber } from './reward-event.subscriber';
import { CapCounterService } from './cap-counter.service';
import { PenaltyService } from './penalty.service';
import { LeaderboardService } from './leaderboard.service';
import { PeerRecognitionService } from './peer-recognition.service';

@Module({
  controllers: [RewardsController],
  providers: [
    ExpService,
    BadgeService,
    RewardShopService,
    RewardEventSubscriber,
    CapCounterService,
    PenaltyService,
    LeaderboardService,
    PeerRecognitionService,
  ],
  exports: [ExpService, BadgeService],
})
export class RewardsModule {}
