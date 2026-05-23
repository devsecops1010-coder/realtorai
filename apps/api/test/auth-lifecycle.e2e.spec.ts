import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockEmailProvider } from '../src/email/providers/mock.provider';
import { bearer, registerTenant } from './utils/factories';

describe('Auth lifecycle: activation + forgot/reset password (e2e)', () => {
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
    MockEmailProvider.sent = [];
  });

  it('invite → activation email → set password → login works', async () => {
    const owner = await registerTenant(app);

    // Owner invites a realtor.
    const invite = await request(app.getHttpServer())
      .post('/users/invite')
      .set(bearer(owner.accessToken))
      .send({ name: 'מתווך', email: 'realtor@test.co', role: 'realtor' })
      .expect(201);
    expect(invite.body.status).toBe('invited');

    // An activation email was sent.
    expect(MockEmailProvider.sent.length).toBe(1);
    const email = MockEmailProvider.sent[0];
    expect(email.to).toBe('realtor@test.co');
    expect(email.category).toBe('invite');

    // Token lives in the DB.
    const tokenRow = await prisma.unscoped().activationToken.findFirst({
      where: { userId: invite.body.id, usedAt: null },
    });
    expect(tokenRow).not.toBeNull();

    // Recover the raw token from the email body (link contains it).
    const link = email.text.match(/\/activate\/([A-Za-z0-9_-]+)/);
    expect(link).not.toBeNull();
    const rawToken = link![1];

    // Preview returns user identity without consuming.
    const preview = await request(app.getHttpServer())
      .get(`/auth/activate/${rawToken}`)
      .expect(200);
    expect(preview.body.email).toBe('realtor@test.co');

    // Complete activation with a new password.
    await request(app.getHttpServer())
      .post(`/auth/activate/${rawToken}`)
      .send({ password: 'Realtor1!' })
      .expect(200);

    // User is now active and can log in.
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'realtor@test.co', password: 'Realtor1!' })
      .expect(200);
    expect(login.body.user.role).toBe('realtor');

    // Replaying the same token now fails.
    await request(app.getHttpServer())
      .post(`/auth/activate/${rawToken}`)
      .send({ password: 'Realtor1!' })
      .expect(400);
  });

  it('forgot-password → reset → old refresh tokens revoked', async () => {
    const user = await registerTenant(app);
    // Login once so a refresh token exists to be revoked.
    const before = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'TestPass1!' })
      .expect(200);
    const oldRefresh = before.body.tokens.refreshToken;

    // Request reset — always returns 204 regardless.
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(204);

    expect(MockEmailProvider.sent.length).toBe(1);
    const email = MockEmailProvider.sent[0];
    expect(email.category).toBe('password_reset');
    const link = email.text.match(/\/reset\/([A-Za-z0-9_-]+)/);
    expect(link).not.toBeNull();
    const rawToken = link![1];

    // Reset to a new password.
    await request(app.getHttpServer())
      .post(`/auth/reset-password/${rawToken}`)
      .send({ password: 'NewPass1!' })
      .expect(204);

    // Old password no longer works.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'TestPass1!' })
      .expect(401);

    // New password works.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'NewPass1!' })
      .expect(200);

    // Pre-existing refresh token was revoked.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('forgot-password for unknown email returns 204 silently (no enumeration)', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nobody@nowhere.test' })
      .expect(204);

    expect(MockEmailProvider.sent.length).toBe(0);
  });
});
