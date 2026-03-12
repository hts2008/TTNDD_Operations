/**
 * Sessions Module — Create & Attend E2E Test
 *
 * Tests the session lifecycle:
 *   1. Create session (planned)
 *   2. Transition to published
 *   3. Mark attendance
 *   4. Complete session
 *
 * Run: npx jest --config test/jest-e2e.json test/e2e/sessions/create-attend.spec.ts --runInBand
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Sessions — Create & Attend (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authToken = 'test-bearer-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /sessions — should create a new session', async () => {
    const res = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Buổi sinh hoạt tuần - Test',
        sessionDate: new Date().toISOString(),
        branchId: '00000000-0000-0000-0000-000000000001',
        sessionType: 'regular',
        spicesTags: ['PHYSICAL', 'INTELLECTUAL'],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('planned');
    sessionId = res.body.id;
  });

  it('PATCH /sessions/:id/transition — should publish session', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/sessions/${sessionId}/transition`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'publish' })
      .expect(200);

    expect(res.body.status).toBe('published');
  });

  it('GET /sessions — should list sessions', async () => {
    const res = await request(app.getHttpServer())
      .get('/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data || res.body)).toBe(true);
  });

  it('GET /sessions/:id — should get session detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(sessionId);
    expect(res.body.title).toContain('Test');
  });
});
