import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { PointsService } from './points.service';
import { EarnPointDto } from './dto/earn-point.dto';
import { SpendPointDto } from './dto/spend-point.dto';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  async getBalance(@Query('discordId') discordId: string) {
    const balance = await this.pointsService.getBalance(discordId);
    return { ok: true, data: { balance: balance.toString() } };
  }

  @Post('earn')
  async earn(@Body(new ValidationPipe()) dto: EarnPointDto) {
    const result = await this.pointsService.earn(dto);
    return { ok: true, data: result };
  }

  @Post('spend')
  async spend(@Body(new ValidationPipe()) dto: SpendPointDto) {
    const result = await this.pointsService.spend(dto);
    return { ok: true, data: result };
  }

  @Get('ledger')
  async getLedger(
    @Query('discordId') discordId: string,
    @Query('limit') limit: number,
  ) {
    const ledger = await this.pointsService.getLedger(discordId, limit);
    return { ok: true, data: ledger };
  }
}
