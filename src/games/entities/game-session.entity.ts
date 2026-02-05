import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GameType {
  RAID = 'RAID',
  AUCTION = 'AUCTION',
}

export enum GameStatus {
  CREATED = 'CREATED',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  SETTLED = 'SETTLED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity('game_session')
export class GameSession {
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
    default: GameStatus.CREATED,
  })
  status: GameStatus;

  @Column({ type: 'json' })
  config: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column()
  createdBy: string; // discordId

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
