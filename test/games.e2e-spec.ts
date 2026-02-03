import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';
import {
  GameType,
  GameStatus,
} from '../src/games/entities/game-session.entity';

describe('Games (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 10000);

  afterAll(async () => {
    await app.close();
  });

  it('should create, join, and start a game session', async () => {
    const creatorId = `creator_${uuidv4()}`;
    const playerId = `player_${uuidv4()}`;

    await request(app.getHttpServer())
      .post('/points/earn')
      .send({
        discordId: playerId,
        amount: 1000,
        reason: 'Initial',
        idempotencyKey: uuidv4(),
      })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post('/games/sessions')
      .send({
        type: GameType.RAID,
        config: { entryFee: 100 },
        createdBy: creatorId,
      })
      .expect(201);

    const sessionId = createRes.body.data.id;
    expect(sessionId).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/games/sessions/${sessionId}/status`)
      .send({ status: GameStatus.OPEN })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/games/sessions/${sessionId}/join`)
      .send({
        discordId: playerId,
      })
      .expect(201);

    const balanceRes = await request(app.getHttpServer())
      .get(`/points/balance?discordId=${playerId}`)
      .expect(200);

    expect(balanceRes.body.data.balance).toBe('900');

    await request(app.getHttpServer())
      .patch(`/games/sessions/${sessionId}/status`)
      .send({ status: GameStatus.IN_PROGRESS })
      .expect(200);

    const sessionRes = await request(app.getHttpServer())
      .get(`/games/sessions/${sessionId}`)
      .expect(200);

    expect(sessionRes.body.data.status).toBe(GameStatus.IN_PROGRESS);
    expect(sessionRes.body.data.startedAt).toBeDefined();
  });
});
