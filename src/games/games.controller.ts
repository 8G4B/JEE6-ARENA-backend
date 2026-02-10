import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { GameType } from './entities/game-round.entity';
import { PointsService } from '../points/points.service';
import { InjectRepository } from '@nestjs/typeorm';
import { GameBet } from './entities/game-bet.entity';
import { Repository } from 'typeorm';

@Controller('games')
export class GamesController {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly pointsService: PointsService,
    @InjectRepository(GameBet)
    private readonly betRepository: Repository<GameBet>,
  ) {}

  @Get('rounds/current')
  async getCurrentRound(@Query('type') type: string) {
    return await this.roundsService.getCurrentOpenRound(type as GameType);
  }

  @Get('rounds/:id')
  async getRound(@Param('id') id: string) {
    return await this.roundsService.getRound(id);
  }

  @Post('rounds/:id/bets')
  async placeBet(
    @Param('id') roundId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: { discordId: string; amount: string; choice: any },
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const amount = BigInt(dto.amount);

    return await this.roundsService.placeBet(roundId, {
      discordId: dto.discordId,
      amount,
      choice: dto.choice as Record<string, any>,
      idempotencyKey,
    });
  }

  @Get('rounds/:id/bets')
  async getMyBets(
    @Param('id') roundId: string,
    @Query('discordId') discordId: string,
  ) {
    return await this.betRepository.find({
      where: { roundId, discordId },
    });
  }
}
