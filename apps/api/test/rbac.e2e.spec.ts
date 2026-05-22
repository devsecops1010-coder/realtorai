import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('RBAC (e2e)', () => {
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

  it('office_owner can invite users; realtor cannot', async () => {
    const owner = await registerTenant(app);

    // Invite a realtor
    const inviteRes = await request(app.getHttpServer())
      .post('/users/invite')
      .set(bearer(owner.accessToken))
      .send({
        name: 'New Realtor',
        email: `realtor+${Date.now()}@x.co`,
        role: 'realtor',
      })
      .expect(201);

    // Have the owner set the realtor to active + give a password, then login as them.
    // Direct DB update because there's no public "set password" endpoint yet.
    const passwordHash = await bcrypt.hash('RealtorPass1!', 10);
    await prisma.$executeRawUnsafe(
      `UPDATE users SET status = 'active', "passwordHash" = $1 WHERE id = $2`,
      passwordHash,
      inviteRes.body.id,
    );

    const realtorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: inviteRes.body.email, password: 'RealtorPass1!' })
      .expect(200);

    const realtorToken = realtorLogin.body.tokens.accessToken;

    // realtor tries to invite another user — should fail with 403
    await request(app.getHttpServer())
      .post('/users/invite')
      .set(bearer(realtorToken))
      .send({
        name: 'Blocked',
        email: `blocked+${Date.now()}@x.co`,
        role: 'realtor',
      })
      .expect(403);
  });

  it('non-platform_admin cannot access /admin/tenants', async () => {
    const owner = await registerTenant(app);

    await request(app.getHttpServer())
      .get('/admin/tenants')
      .set(bearer(owner.accessToken))
      .expect(403);
  });

  it('cannot invite a platform_admin from tenant scope', async () => {
    const owner = await registerTenant(app);

    await request(app.getHttpServer())
      .post('/users/invite')
      .set(bearer(owner.accessToken))
      .send({
        name: 'Should Fail',
        email: `noway+${Date.now()}@x.co`,
        role: 'platform_admin',
      })
      .expect(403);
  });
});
