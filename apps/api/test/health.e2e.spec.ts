import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

describe('Health endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok with uptime (public)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /ready reports db + redis up (public)', async () => {
    const res = await request(app.getHttpServer()).get('/ready').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.db.status).toBe('up');
    expect(res.body.info.redis.status).toBe('up');
  });
});
