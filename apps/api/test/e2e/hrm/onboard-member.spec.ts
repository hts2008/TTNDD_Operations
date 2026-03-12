/**
 * HRM Module — Member Onboarding E2E Test
 *
 * Tests the complete member lifecycle:
 *   1. Create org member
 *   2. Get member by ID
 *   3. Update member profile
 *   4. List members with pagination
 *
 * Run: npx jest --config test/jest-e2e.json test/e2e/hrm/onboard-member.spec.ts --runInBand
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('HRM — Member Onboarding (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdMemberId: string;

  const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // TODO: Replace with actual Firebase test token or mock auth guard
    authToken = 'test-bearer-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /hrm/members — should create a new member', async () => {
    const res = await request(app.getHttpServer())
      .post('/hrm/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: `test-${Date.now()}@dtndd.local`,
        displayName: 'Nguyễn Văn Test',
        role: 'member',
        branchId: null,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.displayName).toBe('Nguyễn Văn Test');
    createdMemberId = res.body.id;
  });

  it('GET /hrm/members/:id — should retrieve created member', async () => {
    const res = await request(app.getHttpServer())
      .get(`/hrm/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdMemberId);
    expect(res.body.displayName).toBe('Nguyễn Văn Test');
  });

  it('GET /hrm/members — should list members with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/hrm/members')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(Array.isArray(res.body.data || res.body)).toBe(true);
  });

  it('PATCH /hrm/members/:id — should update member profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/hrm/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        displayName: 'Nguyễn Văn Updated',
      })
      .expect(200);

    expect(res.body.displayName).toBe('Nguyễn Văn Updated');
  });
});
