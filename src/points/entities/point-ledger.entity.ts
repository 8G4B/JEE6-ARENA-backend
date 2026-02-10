import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint.transformer';

export enum LedgerRefType {
  GAME = 'GAME',
  ADMIN = 'ADMIN',
  TRANSFER = 'TRANSFER',
  ETC = 'ETC',
}

export enum LedgerReason {
  RACE_BET = 'RACE_BET',
  RACE_PAYOUT = 'RACE_PAYOUT',
  BUSTA_BET = 'BUSTA_BET',
  BUSTA_PAYOUT = 'BUSTA_PAYOUT',
  REFUND = 'REFUND',
  ADMIN_ADJUST = 'ADMIN_ADJUST',
  ETC = 'ETC',
}

@Entity('point_ledger')
export class PointLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  discordId: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  delta: bigint;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  balanceAfter: bigint;

  @Column({
    type: 'enum',
    enum: LedgerReason,
    default: LedgerReason.ETC,
  })
  reason: LedgerReason;

  @Column({
    type: 'enum',
    enum: LedgerRefType,
    nullable: true,
  })
  refType: LedgerRefType;

  @Column({ nullable: true })
  refId: string;

  @Index({ unique: true })
  @Column()
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
