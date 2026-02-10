import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { GameRound } from './game-round.entity';
import { BigIntTransformer } from '../../common/transformers/bigint.transformer';

export enum BetStatus {
  PLACED = 'PLACED',
  CANCELLED = 'CANCELLED',
  SETTLED = 'SETTLED',
}

@Entity('game_bet')
@Unique(['roundId', 'discordId'])
export class GameBet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  roundId: string;

  @ManyToOne(() => GameRound)
  @JoinColumn({ name: 'roundId' })
  round: GameRound;

  @Column()
  @Index()
  discordId: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  amount: bigint;

  @Column({ type: 'json' })
  choice: Record<string, any>; // { horseId } or { autoCashout }

  @Column({
    type: 'enum',
    enum: BetStatus,
    default: BetStatus.PLACED,
  })
  status: BetStatus;

  @Column({
    type: 'bigint',
    default: 0,
    transformer: BigIntTransformer,
  })
  payout: bigint;

  @Column({ unique: true })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
