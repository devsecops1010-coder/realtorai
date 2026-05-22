import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('register-tenant creates tenant, office, owner and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register-tenant')
      .send({
        tenantName: 'Acme RE',
        officeName: 'Main',
        ownerName: 'Avi',
        email: 'avi@acme.co',
        password: 'TestPass1!',
      })
      .expect(201);

    expect(res.body.user).toMatchObject({
      name: 'Avi',
      email: 'avi@acme.co',
      role: 'office_owner',
    });
    expect(res.body.tokens.accessToken).toMatch(/^eyJ/);
    expect(res.body.tokens.refreshToken).toMatch(/^eyJ/);
  });

  it('register-tenant rejects weak password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register-tenant')
      .send({
        tenantName: 'X',
        officeName: 'Y',
        ownerName: 'Z',
        email: 'z@x.co',
        password: 'weakpass', // no digit
      })
      .expect(400);
  });

  it('login with correct password returns tokens; wrong password returns 401', async () => {
    const t = await registerTenant(app);

    const ok = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: t.email, password: 'TestPass1!' })
      .expect(200);
    expect(ok.body.user.id).toBe(t.ownerId);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: t.email, password: 'WrongPass1!' })
      .expect(401);
  });

  it('GET /auth/me returns the current user when authed, 401 without token', async () => {
    const t = await registerTenant(app);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set(bearer(t.accessToken))
      .expect(200);
    expect(me.body.id).toBe(t.ownerId);
    expect(me.body.role).toBe('office_owner');

    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('logout revokes all refresh tokens for the user', async () => {
    const t = await registerTenant(app);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set(bearer(t.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: t.refreshToken })
      .expect(401);
  });

  it('refresh issues new tokens and revokes the old refresh token', async () => {
    const t = await registerTenant(app);

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: t.refreshToken })
      .expect(200);

    expect(res.body.accessToken).toMatch(/^eyJ/);
    expect(res.body.refreshToken).not.toBe(t.refreshToken);

    // old refresh token should no longer work
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: t.refreshToken })
      .expect(401);
  });
});
