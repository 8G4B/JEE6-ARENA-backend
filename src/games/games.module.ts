import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSession } from './entities/game-session.entity';
import { GameParticipant } from './entities/game-participant.entity';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameSession, GameParticipant]),
    PointsModule,
  ],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
