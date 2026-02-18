import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoundsService } from './rounds.service';
import { GameType } from './entities/game-round.entity';
import { PointsService } from '../points/points.service';
import { InjectRepository } from '@nestjs/typeorm';
import { GameBet } from './entities/game-bet.entity';
import type { Repository } from 'typeorm';
import type { Response } from 'express';
import { Res } from '@nestjs/common';

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

  @UseGuards(JwtAuthGuard)
  @Post('rounds/:id/bets')
  async placeBet(
    @Param('id') roundId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: { amount: string; choice: any },
    @Req() req: any,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const { userId } = req.user; // Extracted from JWT by JwtStrategy
    const amount = BigInt(dto.amount);

    return await this.roundsService.placeBet(roundId, {
      discordId: userId,
      amount,
      choice: dto.choice as Record<string, any>,
      idempotencyKey,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('rounds/:id/bets')
  async getMyBets(
    @Param('id') roundId: string,
    @Req() req: any,
  ) {
    const { userId } = req.user;
    return await this.betRepository.find({
      where: { roundId, discordId: userId },
    });
  }

  @Get('sse')
  async getSSE(
    @Query('types') types: string,
    @Query('discordId') discordId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const eventStream = this.roundsService.getSSEStream(types, discordId);

    eventStream.on('data', (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    res.on('close', () => {
      eventStream.destroy();
    });
  }
}
