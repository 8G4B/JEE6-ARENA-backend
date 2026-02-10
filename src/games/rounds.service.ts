import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GameRound, GameStatus, GameType } from './entities/game-round.entity';
import { GameBet, BetStatus } from './entities/game-bet.entity';
import { ProvablyFairUtil } from '../common/utils/provably-fair.util';
import { RaceService } from './race.service';
import { BustaService } from './busta.service';
import { PointsService } from '../points/points.service';
import {
  LedgerReason,
  LedgerRefType,
} from '../points/entities/point-ledger.entity';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(GameRound)
    private roundRepository: Repository<GameRound>,
    @InjectRepository(GameBet)
    private betRepository: Repository<GameBet>,
    private raceService: RaceService,
    private bustaService: BustaService,
    private pointsService: PointsService,
    private dataSource: DataSource,
  ) {}

  async createRound(type: GameType): Promise<GameRound> {
    const serverSeed = ProvablyFairUtil.generateServerSeed();
    const hash = ProvablyFairUtil.hashServerSeed(serverSeed);

    const config =
      type === GameType.RACE
        ? this.raceService.getDefaultConfig()
        : this.bustaService.getDefaultConfig();

    const round = this.roundRepository.create({
      type,
      status: GameStatus.OPEN,
      config,
      serverSeed,
      serverSeedHash: hash,
      nonce: Math.floor(Date.now() / 1000),
    });

    return this.roundRepository.save(round);
  }

  async getCurrentOpenRound(type: GameType): Promise<GameRound | null> {
    return this.roundRepository.findOne({
      where: { type, status: GameStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
  }

  async getRound(id: string): Promise<GameRound> {
    const round = await this.roundRepository.findOne({ where: { id } });
    if (!round) throw new NotFoundException('Round not found');
    return round;
  }

  async lockRound(id: string): Promise<GameRound> {
    const round = await this.getRound(id);
    if (round.status !== GameStatus.OPEN) {
      throw new BadRequestException('Round is not OPEN');
    }

    round.status = GameStatus.LOCKED;
    round.lockAt = new Date();

    const serverSeed = await this.getServerSeedInternal(id);
    const result =
      round.type === GameType.RACE
        ? this.raceService.calculateResult(round, serverSeed)
        : this.bustaService.calculateResult(round, serverSeed);

    round.result = result;
    round.status = GameStatus.RESOLVED;
    round.resolveAt = new Date();
    round.serverSeed = serverSeed;

    return this.roundRepository.save(round);
  }

  async settleRound(id: string): Promise<void> {
    const round = await this.getRound(id);
    if (round.status !== GameStatus.RESOLVED) {
      throw new BadRequestException('Round must be RESOLVED before settlement');
    }

    const bets = await this.betRepository.find({
      where: { roundId: id, status: BetStatus.PLACED },
    });

    for (const bet of bets) {
      await this.settleBet(bet, round);
    }

    round.status = GameStatus.SETTLED;
    round.settleAt = new Date();
    await this.roundRepository.save(round);
  }

  private async settleBet(bet: GameBet, round: GameRound) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updateResult = await queryRunner.manager.update(
        GameBet,
        { id: bet.id, status: BetStatus.PLACED },
        { status: BetStatus.SETTLED },
      );

      if (updateResult.affected !== 1) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const payout =
        round.type === GameType.RACE
          ? this.raceService.calculatePayout(
              bet,
              round.result as { winningIndex: number },
              round,
            )
          : this.bustaService.calculatePayout(
              bet,
              round.result as { bustMultiplier: number },
            );

      if (payout > 0n) {
        await this.pointsService.earnInternal(queryRunner.manager, {
          discordId: bet.discordId,
          amount: payout,
          reason:
            round.type === GameType.RACE
              ? LedgerReason.RACE_PAYOUT
              : LedgerReason.BUSTA_PAYOUT,
          refType: LedgerRefType.GAME,
          refId: round.id,
          idempotencyKey: `payout:${bet.id}`,
        });
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(`Failed to settle bet ${bet.id}:`, err);
    } finally {
      await queryRunner.release();
    }
  }

  private async getServerSeedInternal(id: string): Promise<string> {
    const round = await this.roundRepository
      .createQueryBuilder('round')
      .addSelect('round.serverSeed')
      .where('round.id = :id', { id })
      .getOne();
    return round?.serverSeed || '';
  }

  async placeBet(
    roundId: string,
    data: {
      discordId: string;
      amount: bigint;
      choice: any;
      idempotencyKey: string;
    },
  ): Promise<GameBet> {
    const round = await this.getRound(roundId);
    if (round.status !== GameStatus.OPEN) {
      throw new BadRequestException('Round is not OPEN for betting');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.pointsService.spendInternal(queryRunner.manager, {
        discordId: data.discordId,
        amount: data.amount,
        reason:
          round.type === GameType.RACE
            ? LedgerReason.RACE_BET
            : LedgerReason.BUSTA_BET,
        refType: LedgerRefType.GAME,
        refId: round.id,
        idempotencyKey: data.idempotencyKey,
      });

      const bet = queryRunner.manager.create(GameBet, {
        roundId,
        discordId: data.discordId,
        amount: data.amount,
        choice: data.choice as Record<string, any>,
        idempotencyKey: data.idempotencyKey,
        status: BetStatus.PLACED,
      });

      const savedBet = await queryRunner.manager.save(bet);
      await queryRunner.commitTransaction();
      return savedBet;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to place bet');
    } finally {
      await queryRunner.release();
    }
  }
}
