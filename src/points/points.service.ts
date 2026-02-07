import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { PointLedger, LedgerRefType } from './entities/point-ledger.entity';
import { PointBalance } from './entities/point-balance.entity';
import { EarnPointDto } from './dto/earn-point.dto';
import { SpendPointDto } from './dto/spend-point.dto';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointLedger)
    private ledgerRepository: Repository<PointLedger>,
    @InjectRepository(PointBalance)
    private balanceRepository: Repository<PointBalance>,
    private dataSource: DataSource,
  ) {}

  async getBalance(discordId: string): Promise<bigint> {
    const balance = await this.balanceRepository.findOne({
      where: { discordId },
    });
    return balance ? BigInt(balance.balance) : 0n;
  }

  async getLedger(
    discordId: string,
    limit: number = 20,
  ): Promise<PointLedger[]> {
    return this.ledgerRepository.find({
      where: { discordId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async earn(
    dto: EarnPointDto,
  ): Promise<{ balance: string; ledgerId: string }> {
    return this.processTransaction(async (manager) => {
      // 1. Check Idempotency
      const existingLedger = await manager.findOne(PointLedger, {
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingLedger) {
        throw new ConflictException(
          'Duplicate transaction (idempotency key conflict)',
        );
      }

      // 2. Lock & Upsert Balance
      let balanceEntity = await manager.findOne(PointBalance, {
        where: { discordId: dto.discordId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balanceEntity) {
        balanceEntity = manager.create(PointBalance, {
          discordId: dto.discordId,
          balance: '0',
        });
        await manager.save(balanceEntity);
      }

      const currentBalance = BigInt(balanceEntity.balance);
      const newBalance = currentBalance + BigInt(dto.amount);

      // 3. Create Ledger
      const ledger = manager.create(PointLedger, {
        discordId: dto.discordId,
        amount: dto.amount.toString(),
        reason: dto.reason,
        refType: dto.refType || LedgerRefType.ETC,
        refId: dto.refId,
        idempotencyKey: dto.idempotencyKey,
      });
      await manager.save(ledger);

      // 4. Update Balance
      balanceEntity.balance = newBalance.toString();
      await manager.save(balanceEntity);

      return { balance: balanceEntity.balance, ledgerId: ledger.id };
    });
  }

  async spend(
    dto: SpendPointDto,
  ): Promise<{ balance: string; ledgerId: string }> {
    return this.processTransaction(async (manager) => {
      // 1. Check Idempotency
      const existingLedger = await manager.findOne(PointLedger, {
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingLedger) {
        throw new ConflictException(
          'Duplicate transaction (idempotency key conflict)',
        );
      }

      // 2. Lock Balance
      const balanceEntity = await manager.findOne(PointBalance, {
        where: { discordId: dto.discordId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balanceEntity) {
        throw new BadRequestException('Insufficient funds (User not found)');
      }

      const currentBalance = BigInt(balanceEntity.balance);
      const spendAmount = BigInt(dto.amount);

      if (currentBalance < spendAmount) {
        throw new BadRequestException('Insufficient funds');
      }

      const newBalance = currentBalance - spendAmount;

      // 3. Create Ledger
      const ledger = manager.create(PointLedger, {
        discordId: dto.discordId,
        amount: (-Number(dto.amount)).toString(),
        reason: dto.reason,
        refType: dto.refType || LedgerRefType.ETC,
        refId: dto.refId,
        idempotencyKey: dto.idempotencyKey,
      });

      await manager.save(ledger);

      // 4. Update Balance
      balanceEntity.balance = newBalance.toString();
      await manager.save(balanceEntity);

      return { balance: balanceEntity.balance, ledgerId: ledger.id };
    });
  }

  private async processTransaction<T>(
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
