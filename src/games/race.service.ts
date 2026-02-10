import { Injectable } from '@nestjs/common';
import { GameRound } from './entities/game-round.entity';
import { GameBet } from './entities/game-bet.entity';
import { ProvablyFairUtil } from '../common/utils/provably-fair.util';

@Injectable()
export class RaceService {
  private readonly CLIENT_SEED = 'JEE6_ARENA_V1';

  getDefaultConfig(): { weights: number[]; odds: number[]; houseEdge: number } {
    return {
      weights: [0.1, 0.15, 0.2, 0.25, 0.15, 0.15],
      odds: [8.5, 5.5, 4.2, 3.4, 5.5, 5.5],
      houseEdge: 0.05, // 5%
    };
  }

  calculateResult(
    round: GameRound,
    serverSeed: string,
  ): { winningIndex: number } {
    const r = ProvablyFairUtil.generateRandom(
      serverSeed,
      this.CLIENT_SEED,
      round.nonce,
    );
    const weights = (round.config as { weights: number[] }).weights;

    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        return { winningIndex: i };
      }
    }
    return { winningIndex: weights.length - 1 };
  }

  calculatePayout(
    bet: GameBet,
    result: { winningIndex: number },
    round: GameRound,
  ): bigint {
    const winningIndex = result.winningIndex;
    const choice = bet.choice as { horseId: number };

    if (choice.horseId === winningIndex) {
      const odds = (round.config.odds as number[])[winningIndex];
      // payout = floor(amount * odds)
      return BigInt(Math.floor(Number(bet.amount) * odds));
    }
    return 0n;
  }
}
