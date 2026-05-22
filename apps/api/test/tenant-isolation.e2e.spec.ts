import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Tenant isolation (e2e)', () => {
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

  it('GET /offices/:id of another tenant is not visible (404)', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    await request(app.getHttpServer())
      .get(`/offices/${b.officeId}`)
      .set(bearer(a.accessToken))
      .expect(404);
  });

  it('PATCH /users/:id cannot update a user from another tenant (404)', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    await request(app.getHttpServer())
      .patch(`/users/${b.ownerId}`)
      .set(bearer(a.accessToken))
      .send({ name: 'Hacker' })
      .expect(404);

    // verify b is untouched
    const meB = await request(app.getHttpServer())
      .get('/auth/me')
      .set(bearer(b.accessToken))
      .expect(200);
    expect(meB.body.name).not.toBe('Hacker');
  });

  it('GET /users returns only this tenant\'s users', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    // Invite an extra realtor in tenant A
    await request(app.getHttpServer())
      .post('/users/invite')
      .set(bearer(a.accessToken))
      .send({
        name: 'Realtor A',
        email: `realtorA+${Date.now()}@x.co`,
        role: 'realtor',
      })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get('/users')
      .set(bearer(a.accessToken))
      .expect(200);
    expect(listA.body.map((u: any) => u.email)).not.toContain(b.email);
    expect(listA.body.length).toBe(2); // owner + invitee

    const listB = await request(app.getHttpServer())
      .get('/users')
      .set(bearer(b.accessToken))
      .expect(200);
    expect(listB.body.length).toBe(1);
  });

  it('GET /offices/current returns only the caller\'s office', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);

    const oa = await request(app.getHttpServer())
      .get('/offices/current')
      .set(bearer(a.accessToken))
      .expect(200);
    expect(oa.body.id).toBe(a.officeId);
    expect(oa.body.tenantId).toBe(a.tenantId);

    const ob = await request(app.getHttpServer())
      .get('/offices/current')
      .set(bearer(b.accessToken))
      .expect(200);
    expect(ob.body.id).toBe(b.officeId);
  });
});
