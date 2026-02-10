import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  PointLedger,
  LedgerRefType,
  LedgerReason,
} from './entities/point-ledger.entity';
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
    return balance ? balance.balance : 0n;
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
    const amount = BigInt(dto.amount);
    if (amount <= 0n) throw new BadRequestException('Amount must be positive');
    if (amount > 2147483647n) {
      throw new BadRequestException('Amount exceeds limit');
    }

    return this.processTransaction(async (manager) => {
      return this.earnInternal(manager, {
        ...dto,
        amount,
        reason: dto.reason as LedgerReason,
      });
    });
  }

  async earnInternal(
    manager: EntityManager,
    data: {
      discordId: string;
      amount: bigint;
      idempotencyKey: string;
      reason?: LedgerReason;
      refType?: LedgerRefType;
      refId?: string;
    },
  ): Promise<{ balance: string; ledgerId: string }> {
    const existingLedger = await manager.findOne(PointLedger, {
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existingLedger) {
      return {
        balance: existingLedger.balanceAfter.toString(),
        ledgerId: existingLedger.id,
      };
    }

    let balanceEntity = await manager.findOne(PointBalance, {
      where: { discordId: data.discordId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!balanceEntity) {
      balanceEntity = manager.create(PointBalance, {
        discordId: data.discordId,
        balance: 0n,
      });
      await manager.save(balanceEntity);
    }

    const currentBalance = balanceEntity.balance;
    const newBalance = currentBalance + data.amount;

    const ledger = manager.create(PointLedger, {
      discordId: data.discordId,
      delta: data.amount,
      balanceAfter: newBalance,
      reason: data.reason || LedgerReason.ETC,
      refType: data.refType || LedgerRefType.ETC,
      refId: data.refId,
      idempotencyKey: data.idempotencyKey,
    });
    await manager.save(ledger);

    balanceEntity.balance = newBalance;
    await manager.save(balanceEntity);

    return { balance: newBalance.toString(), ledgerId: ledger.id };
  }

  async spend(
    dto: SpendPointDto,
  ): Promise<{ balance: string; ledgerId: string }> {
    const amount = BigInt(dto.amount);
    if (amount <= 0n) throw new BadRequestException('Amount must be positive');
    if (amount > 2147483647n) {
      throw new BadRequestException('Amount exceeds limit');
    }

    return this.processTransaction(async (manager) => {
      return this.spendInternal(manager, {
        ...dto,
        amount,
        reason: dto.reason as LedgerReason,
      });
    });
  }

  async spendInternal(
    manager: EntityManager,
    data: {
      discordId: string;
      amount: bigint;
      idempotencyKey: string;
      reason?: LedgerReason;
      refType?: LedgerRefType;
      refId?: string;
    },
  ): Promise<{ balance: string; ledgerId: string }> {
    const existingLedger = await manager.findOne(PointLedger, {
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existingLedger) {
      return {
        balance: existingLedger.balanceAfter.toString(),
        ledgerId: existingLedger.id,
      };
    }

    const balanceEntity = await manager.findOne(PointBalance, {
      where: { discordId: data.discordId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!balanceEntity) {
      throw new BadRequestException('Insufficient funds (User not found)');
    }

    const currentBalance = balanceEntity.balance;

    if (currentBalance < data.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    const newBalance = currentBalance - data.amount;

    const ledger = manager.create(PointLedger, {
      discordId: data.discordId,
      delta: -data.amount,
      balanceAfter: newBalance,
      reason: data.reason || LedgerReason.ETC,
      refType: data.refType || LedgerRefType.ETC,
      refId: data.refId,
      idempotencyKey: data.idempotencyKey,
    });

    await manager.save(ledger);

    balanceEntity.balance = newBalance;
    await manager.save(balanceEntity);

    return { balance: newBalance.toString(), ledgerId: ledger.id };
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
