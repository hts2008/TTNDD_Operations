import { Module } from '@nestjs/common';
import { EventsModule } from '../../core/events';
import { RewardsController } from './rewards.controller';
import { ExpService } from './exp.service';
import { BadgeService } from './badge.service';
import { RewardShopService } from './reward-shop.service';
import { RewardEventSubscriber } from './reward-event.subscriber';

@Module({
  controllers: [RewardsController],
  imports: [EventsModule],

  providers: [ExpService, BadgeService, RewardShopService, RewardEventSubscriber],
  exports: [ExpService, BadgeService],
})
export class RewardsModule {}
