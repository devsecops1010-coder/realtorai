import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockEmailProvider } from '../src/email/providers/mock.provider';
import { bearer, registerTenant } from './utils/factories';

/**
 * Validates the permission matrix is actually enforced. The properties
 * controller was migrated as the canary endpoint — POST /properties is
 * gated on `property.create` which the matrix allows for office_owner +
 * office_manager + realtor + team_lead + secretary, but explicitly denies
 * accountant + viewer + mortgage_advisor.
 */
describe('Permissions matrix enforcement (e2e)', () => {
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

  async function createUserWithRole(
    ownerToken: string,
    email: string,
    role: string,
  ): Promise<string> {
    // Invite + activate. The owner has all rights to invite anyone except
    // platform roles.
    const invite = await request(app.getHttpServer())
      .post('/users/invite')
      .set(bearer(ownerToken))
      .send({ name: `user-${role}`, email, role })
      .expect(201);

    // Recover activation token from the mock email + activate the account.
    const email_ = MockEmailProvider.sent.find((m) => m.to === email);
    const m = email_!.text.match(/\/activate\/([A-Za-z0-9_-]+)/);
    const token = m![1];
    await request(app.getHttpServer())
      .post(`/auth/activate/${token}`)
      .send({ password: 'TestPass1!' })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'TestPass1!' })
      .expect(200);
    return login.body.tokens.accessToken;
    void invite;
  }

  it('accountant cannot create property (matrix deny)', async () => {
    const owner = await registerTenant(app);
    const accountantToken = await createUserWithRole(
      owner.accessToken,
      'accountant@test.co',
      'accountant',
    );

    await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(accountantToken))
      .send({ dealType: 'sale', city: 'הרצליה', rooms: 4, price: 2000000 })
      .expect(403);
  });

  it('secretary CAN create property (matrix allow)', async () => {
    const owner = await registerTenant(app);
    const secretaryToken = await createUserWithRole(
      owner.accessToken,
      'secretary@test.co',
      'secretary',
    );

    const res = await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(secretaryToken))
      .send({ dealType: 'sale', city: 'הרצליה', rooms: 4, price: 2000000 })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });

  it('viewer cannot create but CAN view (matrix allow on view, deny on create)', async () => {
    const owner = await registerTenant(app);
    const viewerToken = await createUserWithRole(
      owner.accessToken,
      'viewer@test.co',
      'viewer',
    );

    await request(app.getHttpServer())
      .get('/properties')
      .set(bearer(viewerToken))
      .expect(200);

    await request(app.getHttpServer())
      .post('/properties')
      .set(bearer(viewerToken))
      .send({ dealType: 'sale', city: 'הרצליה', rooms: 4, price: 2000000 })
      .expect(403);
  });
});
