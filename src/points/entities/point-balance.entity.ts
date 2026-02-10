import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint.transformer';

@Entity('point_balance')
export class PointBalance {
  @PrimaryColumn()
  discordId: string;

  @Column({
    type: 'bigint',
    default: 0,
    transformer: BigIntTransformer,
  })
  balance: bigint;

  @UpdateDateColumn()
  updatedAt: Date;
}
