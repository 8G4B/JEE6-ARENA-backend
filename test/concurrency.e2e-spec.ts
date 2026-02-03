import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';

describe('Concurrency (e2e)', () => {
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

  it('should handle concurrent spend requests correctly', async () => {
    const discordId = `concurrent_test_${uuidv4()}`;
    const initialAmount = 1000;
    const spendAmount = 1000;

    await request(app.getHttpServer())
      .post('/points/earn')
      .send({
        discordId,
        amount: initialAmount,
        reason: 'Initial',
        idempotencyKey: uuidv4(),
      })
      .expect(201);

    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/points/spend')
          .send({
            discordId,
            amount: spendAmount,
            reason: `Spend ${i}`,
            idempotencyKey: uuidv4(),
          }),
      );
    }

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const successes = fulfilled.filter((r) => (r as any).value.status === 201);
    const failures = fulfilled.filter((r) => (r as any).value.status === 400);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(4);

    const balanceRes = await request(app.getHttpServer())
      .get(`/points/balance?discordId=${discordId}`)
      .expect(200);

    expect(balanceRes.body.data.balance).toBe('0');
  });
});
