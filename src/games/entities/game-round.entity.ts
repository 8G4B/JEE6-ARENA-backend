import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GameType {
  RACE = 'RACE',
  BUSTA = 'BUSTA',
}

export enum GameStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
  RESOLVED = 'RESOLVED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

@Entity('game_round')
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: GameType,
  })
  type: GameType;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.OPEN,
  })
  status: GameStatus;

  @Column({ type: 'json' })
  config: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column()
  serverSeedHash: string;

  @Column({ select: false, nullable: true })
  serverSeed: string;

  @Column({ default: 0 })
  nonce: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  openAt: Date;

  @Column({ nullable: true })
  lockAt: Date;

  @Column({ nullable: true })
  resolveAt: Date;

  @Column({ nullable: true })
  settleAt: Date;
}
