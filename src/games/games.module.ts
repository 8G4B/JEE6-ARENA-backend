import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRound } from './entities/game-round.entity';
import { GameBet } from './entities/game-bet.entity';
import { GamesController } from './games.controller';
import { PointsModule } from '../points/points.module';
import { RoundsService } from './rounds.service';
import { RaceService } from './race.service';
import { BustaService } from './busta.service';

@Module({
  imports: [TypeOrmModule.forFeature([GameRound, GameBet]), PointsModule],
  controllers: [GamesController],
  providers: [RoundsService, RaceService, BustaService],
  exports: [RoundsService],
})
export class GamesModule {}
