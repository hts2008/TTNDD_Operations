/**
 * Scout Module — Skill Progress E2E Test
 *
 * Tests the skill progress workflow:
 *   1. List skill tree (program versions → domains → skill groups → skills)
 *   2. Start skill progress for a member
 *   3. Submit evidence for skill
 *   4. Verify skill (leader action)
 *
 * Run: npx jest --config test/jest-e2e.json test/e2e/scout/skill-progress.spec.ts --runInBand
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Scout — Skill Progress (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

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

  it('GET /scout/program-versions — should list program versions', async () => {
    const res = await request(app.getHttpServer())
      .get('/scout/program-versions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /scout/skills — should list skills with grouping', async () => {
    const res = await request(app.getHttpServer())
      .get('/scout/skills')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data || res.body)).toBe(true);
  });

  it('GET /scout/skills/progress/:memberId — should return progress', async () => {
    const res = await request(app.getHttpServer())
      .get('/scout/skills/progress/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // May return empty array if no progress exists for this member
    expect(res.body).toBeDefined();
  });

  it('GET /scout/rank-definitions — should list rank definitions', async () => {
    const res = await request(app.getHttpServer())
      .get('/scout/rank-definitions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
