import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  GameType,
  GameStatus,
} from './../src/games/entities/game-round.entity';
import { RoundsService } from './../src/games/rounds.service';
import { DataSource } from 'typeorm';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Game Lifecycle (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roundsService: RoundsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    roundsService = app.get(RoundsService);
    
    if (!dataSource.isInitialized) {
        await dataSource.initialize();
    }
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should complete a full Race game cycle', async () => {
    const discordId = `race_${Date.now()}`;
    const initialPoints = 5000;
    const betAmount = 1000;

    await request(app.getHttpServer())
      .post('/points/earn')
      .send({
        discordId,
        amount: initialPoints,
        idempotencyKey: `init_${discordId}`,
        reason: 'ETC',
      })
      .expect(201);

    const round = await roundsService.createRound(GameType.RACE);
    expect(round.status).toBe(GameStatus.OPEN);

    const betResponse = await request(app.getHttpServer())
      .post(`/games/rounds/${round.id}/bets`)
      .set('Idempotency-Key', `bet_${discordId}`)
      .send({
        discordId,
        amount: String(betAmount),
        choice: { horseId: 0 },
      })
      .expect(201);

    expect(betResponse.body.amount).toBe(String(betAmount));

    const resolvedRound = await roundsService.lockRound(round.id);
    expect(resolvedRound.status).toBe(GameStatus.RESOLVED);

    await roundsService.settleRound(round.id);
    const settledRound = await roundsService.getRound(round.id);
    expect(settledRound.status).toBe(GameStatus.SETTLED);

    const finalBalanceRes = await request(app.getHttpServer())
      .get(`/points/balance?discordId=${discordId}`)
      .expect(200);

    const balanceStr = finalBalanceRes.body.data.balance;
    const result = resolvedRound.result as { winningIndex: number };
    if (result.winningIndex === 0) {
      expect(balanceStr).toBe('12500');
    } else {
      expect(balanceStr).toBe('4000');
    }
  }, 30000);

  it('should complete a full Busta game cycle', async () => {
    const discordId = `busta_${Date.now()}`;
    const initialPoints = 5000;
    const betAmount = 1000;

    await request(app.getHttpServer())
      .post('/points/earn')
      .send({
        discordId,
        amount: initialPoints,
        idempotencyKey: `init_${discordId}`,
        reason: 'ETC',
      })
      .expect(201);

    const round = await roundsService.createRound(GameType.BUSTA);

    await request(app.getHttpServer())
      .post(`/games/rounds/${round.id}/bets`)
      .set('Idempotency-Key', `bet_${discordId}`)
      .send({
        discordId,
        amount: String(betAmount),
        choice: { autoCashout: 2.0 },
      })
      .expect(201);

    const resolvedRound = await roundsService.lockRound(round.id);
    await roundsService.settleRound(round.id);

    const finalBalanceRes = await request(app.getHttpServer())
      .get(`/points/balance?discordId=${discordId}`)
      .expect(200);

    const balanceStr = finalBalanceRes.body.data.balance;
    const result = resolvedRound.result as { bustMultiplier: number };
    if (result.bustMultiplier >= 2.0) {
      expect(balanceStr).toBe('6000'); // 4000 + (1000 * 2.0)
    } else {
      expect(balanceStr).toBe('4000');
    }
  }, 30000);
});
