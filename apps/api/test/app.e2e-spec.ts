import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) — should return ok', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('ttndd-ops-api');
        expect(res.body.version).toBe('0.1.0');
        expect(res.body.database).toBeDefined();
        expect(res.body.database.status).toBe('ok');
      });
  });

  it('/api/v1/organizations/:slug (GET) — should require auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/organizations/dtndd-demo')
      .expect(401);
  });
});
