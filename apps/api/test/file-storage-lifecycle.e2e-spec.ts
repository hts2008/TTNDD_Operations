import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '10000000-0000-4000-8000-000000000071';
const USER_ID = '10000000-0000-4000-8000-000000000072';
const MEMBER_ID = '10000000-0000-4000-8000-000000000073';
const EMAIL = 'p2.file.admin@pilot.ttndd.test';
const FIREBASE_UID = 'p2-file-admin';

function dataOf<T>(body: { data: T }) {
  return body.data;
}

describe('File storage lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const token = `dev:${FIREBASE_UID}`;

  beforeAll(async () => {
    process.env.APP_ENV = 'development';
    process.env.GOOGLE_CLOUD_PROJECT = '';
    process.env.DATABASE_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
    process.env.DATABASE_MIGRATION_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await seedFixture(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await cleanupFixture(prisma);
    }
    if (app) {
      await app.close();
    }
  });

  it('creates upload request, blocks early download, finalizes, then returns download URL', async () => {
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/file-storage/upload-request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        originalName: 'p2 evidence.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        entityType: 'evidence',
        entityId: MEMBER_ID,
      })
      .expect(201);

    const upload = dataOf<{
      fileRefId: string;
      uploadUrl: string;
      objectKey: string;
      expiresAt: string;
    }>(uploadResponse.body);

    expect(upload.fileRefId).toBeDefined();
    expect(upload.uploadUrl).toContain('/file-storage/local-upload/');
    expect(upload.objectKey).toContain(`${ORG_ID}/evidence/`);

    await request(app.getHttpServer())
      .get(`/api/v1/file-storage/${upload.fileRefId}/download-url`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    const finalizeResponse = await request(app.getHttpServer())
      .post('/api/v1/file-storage/finalize')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileRefId: upload.fileRefId,
        objectKey: upload.objectKey,
        checksum: 'sha256:p2filelifecycle',
        sizeBytes: 1024,
      })
      .expect(201);

    expect(
      dataOf<{
        fileRefId: string;
        status: string;
        scanStatus: string;
        checksum: string;
      }>(finalizeResponse.body),
    ).toMatchObject({
      fileRefId: upload.fileRefId,
      status: 'READY',
      scanStatus: 'CLEAN',
      checksum: 'sha256:p2filelifecycle',
    });

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/v1/file-storage/${upload.fileRefId}/download-url`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      dataOf<{ downloadUrl: string; originalName: string; mimeType: string }>(
        downloadResponse.body,
      ),
    ).toMatchObject({
      originalName: 'p2 evidence.pdf',
      mimeType: 'application/pdf',
    });
    expect(dataOf<{ downloadUrl: string }>(downloadResponse.body).downloadUrl).toContain(
      '/file-storage/local-download/',
    );

    const persisted = await prisma.fileObjectRef.findUnique({
      where: { id: upload.fileRefId },
    });
    expect(persisted).toMatchObject({
      status: 'READY',
      scanStatus: 'CLEAN',
      checksum: 'sha256:p2filelifecycle',
    });
    expect(persisted?.finalizedAt).toBeInstanceOf(Date);
  });
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);
  await prisma.organization.upsert({
    where: { slug: 'ttndd-p2-file-lifecycle' },
    update: { name: 'TTNDD P2 File Lifecycle', isActive: true },
    create: {
      id: ORG_ID,
      slug: 'ttndd-p2-file-lifecycle',
      name: 'TTNDD P2 File Lifecycle',
      isActive: true,
      settings: { enabledModules: ['FILE_STORAGE'] },
    },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { firebaseUid: FIREBASE_UID, email: EMAIL, displayName: 'P2 File Admin' },
    create: {
      id: USER_ID,
      firebaseUid: FIREBASE_UID,
      email: EMAIL,
      displayName: 'P2 File Admin',
      isActive: true,
    },
  });
  await prisma.orgMember.upsert({
    where: { id: MEMBER_ID },
    update: { userId: USER_ID, role: 'admin', memberCode: 'P2-FILE-ADMIN', status: 'active' },
    create: {
      id: MEMBER_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      role: 'admin',
      memberCode: 'P2-FILE-ADMIN',
      status: 'active',
      joinedDate: new Date('2026-05-15'),
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.fileObjectRef.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { id: MEMBER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
