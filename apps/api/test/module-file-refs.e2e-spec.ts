import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';

const ORG_ID = '10000000-0000-4000-8000-000000000081';
const BRANCH_ID = '10000000-0000-4000-8000-000000000082';
const USER_ID = '10000000-0000-4000-8000-000000000083';
const MEMBER_ID = '10000000-0000-4000-8000-000000000084';
const SKILL_GROUP_ID = '10000000-0000-4000-8000-000000000085';
const SKILL_ID = '10000000-0000-4000-8000-000000000086';
const ASSET_CATEGORY_ID = '10000000-0000-4000-8000-000000000087';
const COURSE_ID = '10000000-0000-4000-8000-000000000088';
const QUIZ_ID = '10000000-0000-4000-8000-000000000089';
const EMAIL = 'p2.file-integrations@pilot.ttndd.test';
const FIREBASE_UID = 'p2-file-integrations-admin';

function dataOf<T>(body: { data: T }) {
  return body.data;
}

describe('Module FileObjectRef integrations (e2e)', () => {
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

  it('persists READY FileObjectRef IDs across Scout, Assets, LMS, and SOP flows', async () => {
    const scoutFile = await createReadyFile('scout-evidence', MEMBER_ID, 'scout-evidence.pdf');
    const assetFile = await createReadyFile('asset-photo', ASSET_CATEGORY_ID, 'asset-photo.png');
    const lessonFile = await createReadyFile(
      'lms-media',
      COURSE_ID,
      'lesson-video.mp4',
      'video/mp4',
    );
    const questionFile = await createReadyFile('lms-media', QUIZ_ID, 'question-image.png');
    const sopFile = await createReadyFile('sop-attachment', MEMBER_ID, 'sop-attachment.pdf');

    const scout = await request(app.getHttpServer())
      .post(`/api/v1/scout/evidence/${MEMBER_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        skillId: SKILL_ID,
        level: 1,
        evidenceType: 'document',
        fileRefId: scoutFile.fileRefId,
        notes: 'P2 module file ref evidence',
      })
      .expect(201);

    expect(dataOf<{ fileRefId: string }>(scout.body).fileRefId).toBe(scoutFile.fileRefId);

    const asset = await request(app.getHttpServer())
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        assetCode: 'P2-FILE-ASSET-001',
        name: 'P2 File Asset',
        categoryId: ASSET_CATEGORY_ID,
        quantity: 1,
        photoFileRefIds: [assetFile.fileRefId],
      })
      .expect(201);

    expect(dataOf<{ photoFileRefIds: string[] }>(asset.body).photoFileRefIds).toEqual([
      assetFile.fileRefId,
    ]);

    const lesson = await request(app.getHttpServer())
      .post(`/api/v1/lms/courses/${COURSE_ID}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'P2 File Lesson',
        lessonType: 'video',
        content: { type: 'doc' },
        mediaFileRefId: lessonFile.fileRefId,
      })
      .expect(201);

    expect(dataOf<{ mediaFileRefId: string }>(lesson.body).mediaFileRefId).toBe(
      lessonFile.fileRefId,
    );

    const question = await request(app.getHttpServer())
      .post(`/api/v1/lms/quizzes/${QUIZ_ID}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        questionText: 'Which file is attached?',
        questionType: 'multiple_choice',
        options: { choices: ['A', 'B'], correctAnswer: 'A' },
        correctAnswer: 'A',
        mediaFileRefId: questionFile.fileRefId,
      })
      .expect(201);

    expect(dataOf<{ mediaFileRefId: string }>(question.body).mediaFileRefId).toBe(
      questionFile.fileRefId,
    );

    const sop = await request(app.getHttpServer())
      .post('/api/v1/process/sops')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'P2 File SOP',
        category: 'operations',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        attachmentFileRefIds: [sopFile.fileRefId],
      })
      .expect(201);

    const sopData = dataOf<{ versions: Array<{ attachmentFileRefIds: string[] }> }>(sop.body);
    expect(sopData.versions[0]?.attachmentFileRefIds).toEqual([sopFile.fileRefId]);
  });

  it('rejects module file refs that have not been finalized to READY', async () => {
    const pendingFile = await createUploadRequest('scout-evidence', MEMBER_ID, 'pending.pdf');

    await request(app.getHttpServer())
      .post(`/api/v1/scout/evidence/${MEMBER_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        skillId: SKILL_ID,
        level: 2,
        evidenceType: 'document',
        fileRefId: pendingFile.fileRefId,
      })
      .expect(400);
  });

  async function createReadyFile(
    entityType: string,
    entityId: string,
    originalName: string,
    mimeType = 'application/pdf',
  ) {
    const upload = await createUploadRequest(entityType, entityId, originalName, mimeType);
    await request(app.getHttpServer())
      .post('/api/v1/file-storage/finalize')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileRefId: upload.fileRefId,
        objectKey: upload.objectKey,
        checksum: `sha256:${upload.fileRefId.replace(/-/g, '').slice(0, 16)}`,
        sizeBytes: 2048,
      })
      .expect(201);
    return upload;
  }

  async function createUploadRequest(
    entityType: string,
    entityId: string,
    originalName: string,
    mimeType = 'application/pdf',
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/file-storage/upload-request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        originalName,
        mimeType,
        sizeBytes: 2048,
        entityType,
        entityId,
      })
      .expect(201);

    return dataOf<{ fileRefId: string; objectKey: string }>(response.body);
  }
});

async function seedFixture(prisma: PrismaService) {
  await cleanupFixture(prisma);
  await prisma.organization.upsert({
    where: { slug: 'ttndd-p2-module-file-refs' },
    update: { name: 'TTNDD P2 Module File Refs', isActive: true },
    create: {
      id: ORG_ID,
      slug: 'ttndd-p2-module-file-refs',
      name: 'TTNDD P2 Module File Refs',
      isActive: true,
      settings: { enabledModules: ['SCOUT', 'ASSETS', 'LMS', 'PROCESS', 'FILE_STORAGE'] },
    },
  });
  await prisma.branch.upsert({
    where: { orgId_code: { orgId: ORG_ID, code: 'P2-FILE' } },
    update: { name: 'P2 File Branch' },
    create: {
      id: BRANCH_ID,
      orgId: ORG_ID,
      code: 'P2-FILE',
      name: 'P2 File Branch',
      minAge: 6,
      maxAge: 18,
    },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { firebaseUid: FIREBASE_UID, email: EMAIL, displayName: 'P2 File Integrations' },
    create: {
      id: USER_ID,
      firebaseUid: FIREBASE_UID,
      email: EMAIL,
      displayName: 'P2 File Integrations',
      isActive: true,
    },
  });
  await prisma.orgMember.upsert({
    where: { id: MEMBER_ID },
    update: { userId: USER_ID, role: 'admin', branchId: BRANCH_ID, status: 'active' },
    create: {
      id: MEMBER_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      role: 'admin',
      branchId: BRANCH_ID,
      memberCode: 'P2-FILE-ADMIN',
      status: 'active',
      joinedDate: new Date('2026-05-15'),
    },
  });
  await prisma.skillGroup.upsert({
    where: { id: SKILL_GROUP_ID },
    update: { name: 'P2 File Skills' },
    create: {
      id: SKILL_GROUP_ID,
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'P2 File Skills',
    },
  });
  await prisma.skill.upsert({
    where: { id: SKILL_ID },
    update: { name: 'P2 File Evidence Skill' },
    create: {
      id: SKILL_ID,
      orgId: ORG_ID,
      skillGroupId: SKILL_GROUP_ID,
      branchId: BRANCH_ID,
      skillCode: 'P2-FILE-SKILL',
      name: 'P2 File Evidence Skill',
      levels: { '1': 'Submit evidence', '2': 'Submit second evidence' },
      maxLevel: 2,
      spicesTags: [],
    },
  });
  await prisma.assetCategory.upsert({
    where: { id: ASSET_CATEGORY_ID },
    update: { name: 'P2 File Assets' },
    create: { id: ASSET_CATEGORY_ID, orgId: ORG_ID, name: 'P2 File Assets' },
  });
  await prisma.course.upsert({
    where: { id: COURSE_ID },
    update: { title: 'P2 File Course' },
    create: {
      id: COURSE_ID,
      orgId: ORG_ID,
      title: 'P2 File Course',
      targetBranches: [],
      spicesTags: [],
      createdBy: USER_ID,
    },
  });
  await prisma.quiz.upsert({
    where: { id: QUIZ_ID },
    update: { title: 'P2 File Quiz' },
    create: {
      id: QUIZ_ID,
      orgId: ORG_ID,
      courseId: COURSE_ID,
      title: 'P2 File Quiz',
      createdBy: USER_ID,
    },
  });
}

async function cleanupFixture(prisma: PrismaService) {
  await prisma.domainEvent.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sopApproval.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sopVersion.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.sopDocument.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.quizQuestion.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.quiz.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.lesson.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.course.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.asset.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.assetCategory.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.skillEvidence.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.memberSkillProgress.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.skill.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.skillGroup.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.fileObjectRef.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.orgMember.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.branch.deleteMany({ where: { orgId: ORG_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}
