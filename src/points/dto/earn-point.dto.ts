import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { LedgerRefType } from '../entities/point-ledger.entity';

export class EarnPointDto {
  @IsNotEmpty()
  @IsString()
  discordId: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsEnum(LedgerRefType)
  refType?: LedgerRefType;

  @IsOptional()
  @IsString()
  refId?: string;

  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;
}
