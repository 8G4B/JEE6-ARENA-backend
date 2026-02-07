import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointLedger } from './entities/point-ledger.entity';
import { PointBalance } from './entities/point-balance.entity';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointLedger, PointBalance])],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
