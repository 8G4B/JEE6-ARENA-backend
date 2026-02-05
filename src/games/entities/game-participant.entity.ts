import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { GameSession } from './game-session.entity';

@Entity('game_participant')
@Unique(['sessionId', 'discordId'])
export class GameParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => GameSession)
  @JoinColumn({ name: 'sessionId' })
  session: GameSession;

  @Column()
  discordId: string;

  @Column({ type: 'json' })
  state: Record<string, any>;

  @CreateDateColumn()
  joinedAt: Date;
}
