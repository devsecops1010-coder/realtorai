import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { bearer, registerTenant } from './utils/factories';

describe('Tasks (e2e)', () => {
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

  it('create + list + close task; completedAt set when status moves to done', async () => {
    const t = await registerTenant(app);

    const t1 = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(t.accessToken))
      .send({ title: 'Call back lead', type: 'call_lead', assignedUserId: t.ownerId })
      .expect(201);
    expect(t1.body.status).toBe('open');
    expect(t1.body.completedAt).toBeNull();

    const closed = await request(app.getHttpServer())
      .patch(`/tasks/${t1.body.id}`)
      .set(bearer(t.accessToken))
      .send({ status: 'done' })
      .expect(200);
    expect(closed.body.status).toBe('done');
    expect(closed.body.completedAt).not.toBeNull();
  });

  it('mine=true filters to caller-assigned tasks only', async () => {
    const t = await registerTenant(app);
    // task assigned to owner (self)
    await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(t.accessToken))
      .send({ title: 'mine', assignedUserId: t.ownerId })
      .expect(201);
    // task unassigned
    await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(t.accessToken))
      .send({ title: 'others' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/tasks?mine=true')
      .set(bearer(t.accessToken))
      .expect(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].title).toBe('mine');
  });

  it('PATCH another tenant\'s task returns 404', async () => {
    const a = await registerTenant(app);
    const b = await registerTenant(app);
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(b.accessToken))
      .send({ title: 'Bs task' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/tasks/${task.body.id}`)
      .set(bearer(a.accessToken))
      .send({ status: 'done' })
      .expect(404);
  });
});
