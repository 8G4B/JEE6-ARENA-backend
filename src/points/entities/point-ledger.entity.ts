import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum LedgerRefType {
  GAME = 'GAME',
  ADMIN = 'ADMIN',
  TRANSFER = 'TRANSFER',
  ETC = 'ETC',
}

@Entity('point_ledger')
@Unique(['idempotencyKey'])
export class PointLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  discordId: string;

  @Column({ type: 'bigint' })
  amount: string; // TypeORM handles bigint as string

  @Column()
  reason: string;

  @Column({
    type: 'enum',
    enum: LedgerRefType,
    default: LedgerRefType.ETC,
  })
  refType: LedgerRefType;

  @Column({ nullable: true })
  refId: string;

  @Column()
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
