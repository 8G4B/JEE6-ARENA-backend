import { Injectable } from '@nestjs/common';
import { GameRound } from './entities/game-round.entity';
import { GameBet } from './entities/game-bet.entity';
import { ProvablyFairUtil } from '../common/utils/provably-fair.util';

@Injectable()
export class BustaService {
  private readonly CLIENT_SEED = 'JEE6_ARENA_V1';

  getDefaultConfig(): {
    houseEdge: number;
    minMultiplier: number;
    maxMultiplier: number;
  } {
    return {
      houseEdge: 0.01, // 1%
      minMultiplier: 1.01,
      maxMultiplier: 1000.0,
    };
  }

  calculateResult(
    round: GameRound,
    serverSeed: string,
  ): { bustMultiplier: number } {
    const r = ProvablyFairUtil.generateRandom(
      serverSeed,
      this.CLIENT_SEED,
      round.nonce,
    );
    const e = (round.config as { houseEdge: number }).houseEdge || 0.01;

    let multiplier = (1 - e) / (1 - r);

    multiplier = Math.floor(multiplier * 100) / 100;

    if (multiplier < 1.0) multiplier = 1.0;

    return { bustMultiplier: multiplier };
  }

  calculatePayout(bet: GameBet, result: { bustMultiplier: number }): bigint {
    const bustMultiplier = result.bustMultiplier;
    const choice = bet.choice as { autoCashout: number };

    if (choice.autoCashout <= bustMultiplier) {
      return BigInt(Math.floor(Number(bet.amount) * choice.autoCashout));
    }

    return 0n;
  }
}
