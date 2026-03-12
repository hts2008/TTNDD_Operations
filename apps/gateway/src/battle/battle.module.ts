import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BattleGateway } from './battle.gateway';
import { WsAuthGuard } from '../guards/ws-auth.guard';

@Module({
  imports: [ConfigModule],
  providers: [BattleGateway, WsAuthGuard],
})
export class BattleModule {}
