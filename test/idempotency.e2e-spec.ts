import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';

describe('Idempotency (e2e)', () => {
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

  it('should reject duplicate idempotency keys with Conflict', async () => {
    const discordId = `idempotency_test_${uuidv4()}`;
    const idempotencyKey = uuidv4();

    await request(app.getHttpServer())
      .post('/points/earn')
      .send({
        discordId,
        amount: 100,
        reason: 'First',
        idempotencyKey,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/points/earn')
      .send({
        discordId,
        amount: 100,
        reason: 'Duplicate',
        idempotencyKey,
      })
      .expect(409);

    const balanceRes = await request(app.getHttpServer())
      .get(`/points/balance?discordId=${discordId}`)
      .expect(200);

    expect(balanceRes.body.data.balance).toBe('100');
  });
});
