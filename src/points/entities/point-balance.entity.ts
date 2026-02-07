import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class PointBalance {
  @PrimaryColumn()
  discordId: string;

  @Column({ type: 'bigint', default: 0 })
  balance: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
