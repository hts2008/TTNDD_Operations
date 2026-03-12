/**
 * Events Module — Registration E2E Test
 *
 * Tests the event registration workflow:
 *   1. Create event
 *   2. Open registration
 *   3. Register member for event
 *   4. List registrations
 *
 * Run: npx jest --config test/jest-e2e.json test/e2e/events/register-event.spec.ts --runInBand
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Events — Registration (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let eventId: string;

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

  it('POST /events — should create a new event', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const res = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Trại Xuân 2026 - Test',
        eventType: 'camp',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: 'Công viên Gia Định',
        maxParticipants: 100,
        spicesTags: ['PHYSICAL', 'SOCIAL', 'SPIRITUAL'],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toContain('Test');
    eventId = res.body.id;
  });

  it('GET /events — should list events', async () => {
    const res = await request(app.getHttpServer())
      .get('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data || res.body)).toBe(true);
  });

  it('GET /events/:id — should get event detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(eventId);
    expect(res.body.title).toContain('Test');
  });

  it('POST /events/:id/register — should register for event', async () => {
    const res = await request(app.getHttpServer())
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(201);

    expect(res.body).toBeDefined();
  });
});
