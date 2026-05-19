import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const WEB_BASE = process.env.BASE_URL ?? 'http://localhost:3101';
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://ttndd:ttndd_local@127.0.0.1:5432/ttndd_ops?schema=public';
const ADMIN_TOKEN = 'dev:w2-assets-file-admin';
const ORG_ID = '26000000-0000-4000-8000-000000000041';
const USER_ID = '26000000-0000-4000-8000-000000000042';
const MEMBER_ID = '26000000-0000-4000-8000-000000000043';
const ARTIFACT_DIR = path.join(process.cwd(), 'docs', 'artifacts', 'w2-004-assets-file-lifecycle');

interface ApiEnvelope<T> {
  data: T;
}

interface UploadRequest {
  fileRefId: string;
  uploadUrl: string;
  objectKey: string;
}

interface FinalizeUpload {
  fileRefId: string;
  status: 'READY' | 'INFECTED' | 'FAILED';
  scanStatus: 'CLEAN' | 'INFECTED' | 'FAILED';
}

interface AssetResponse {
  id: string;
  name: string;
  assetCode: string;
  photoFileRefIds?: string[];
}

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgwGgG4kQ3wAAAABJRU5ErkJggg==',
  'base64',
);

function dataOf<T>(body: ApiEnvelope<T>) {
  return body.data;
}

function checksum(buffer: Buffer) {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

async function installToken(page: Page) {
  await page.context().addCookies([{ name: 'token', value: ADMIN_TOKEN, url: WEB_BASE }]);
  await page.addInitScript((token) => {
    window.localStorage.setItem('token', token);
  }, ADMIN_TOKEN);
}

async function seedAuthFixture() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });
  try {
    await prisma.organization.upsert({
      where: { id: ORG_ID },
      update: {
        slug: 'w2-assets-file-lifecycle',
        name: 'W2 Assets File Lifecycle',
        isActive: true,
      },
      create: {
        id: ORG_ID,
        slug: 'w2-assets-file-lifecycle',
        name: 'W2 Assets File Lifecycle',
        fullName: 'W2 Assets File Lifecycle Smoke Organization',
        isActive: true,
        settings: {},
      },
    });
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {
        firebaseUid: 'w2-assets-file-admin',
        email: 'w2-assets-file-admin@ttndd.test',
        displayName: 'W2 Assets File Admin',
        isActive: true,
      },
      create: {
        id: USER_ID,
        firebaseUid: 'w2-assets-file-admin',
        email: 'w2-assets-file-admin@ttndd.test',
        displayName: 'W2 Assets File Admin',
        isActive: true,
      },
    });
    await prisma.orgMember.upsert({
      where: { id: MEMBER_ID },
      update: { userId: USER_ID, role: 'admin', memberCode: 'W2-ASSET-ADMIN', status: 'active' },
      create: {
        id: MEMBER_ID,
        orgId: ORG_ID,
        userId: USER_ID,
        role: 'admin',
        memberCode: 'W2-ASSET-ADMIN',
        status: 'active',
        joinedDate: new Date('2026-05-19T00:00:00.000Z'),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function createAssetFixture(request: APIRequestContext) {
  const suffix = Date.now();
  const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };
  const categoryResponse = await request.post(`${API_BASE}/api/v1/assets/categories`, {
    headers,
    data: {
      name: `W2 File Evidence ${suffix}`,
      description: 'Browser smoke category for asset file lifecycle',
      icon: 'box',
    },
  });
  expect(categoryResponse.ok(), await categoryResponse.text()).toBe(true);
  const category = dataOf<{ id: string }>(await categoryResponse.json());

  const assetName = `000 W2 File Lifecycle Asset ${suffix}`;
  const assetResponse = await request.post(`${API_BASE}/api/v1/assets`, {
    headers,
    data: {
      assetCode: `W2FILE-${suffix}`,
      name: assetName,
      categoryId: category.id,
      condition: 'good',
      quantity: 2,
      unit: 'kit',
      location: 'Localhost evidence shelf',
    },
  });
  expect(assetResponse.ok(), await assetResponse.text()).toBe(true);
  const asset = dataOf<AssetResponse>(await assetResponse.json());
  return { asset, assetName, headers };
}

async function runDirectFileLifecycleSmoke(
  request: APIRequestContext,
  headers: Record<string, string>,
  assetId: string,
) {
  const uploadResponse = await request.post(`${API_BASE}/api/v1/file-storage/upload-request`, {
    headers,
    data: {
      originalName: 'direct-asset-photo.png',
      mimeType: 'image/png',
      sizeBytes: PNG_BYTES.length,
      entityType: 'asset',
      entityId: assetId,
    },
  });
  expect(uploadResponse.ok(), await uploadResponse.text()).toBe(true);
  const upload = dataOf<UploadRequest>(await uploadResponse.json());
  expect(upload.uploadUrl).toContain('/api/v1/file-storage/local-upload/');

  const objectResponse = await request.put(upload.uploadUrl, {
    headers: { 'Content-Type': 'image/png' },
    data: PNG_BYTES,
  });
  expect(objectResponse.status(), await objectResponse.text()).toBe(204);

  const finalizeResponse = await request.post(`${API_BASE}/api/v1/file-storage/finalize`, {
    headers,
    data: {
      fileRefId: upload.fileRefId,
      objectKey: upload.objectKey,
      checksum: checksum(PNG_BYTES),
      sizeBytes: PNG_BYTES.length,
    },
  });
  expect(finalizeResponse.ok(), await finalizeResponse.text()).toBe(true);
  expect(dataOf<FinalizeUpload>(await finalizeResponse.json())).toMatchObject({
    fileRefId: upload.fileRefId,
    status: 'READY',
    scanStatus: 'CLEAN',
  });

  const downloadUrlResponse = await request.get(
    `${API_BASE}/api/v1/file-storage/${upload.fileRefId}/download-url`,
    { headers },
  );
  expect(downloadUrlResponse.ok(), await downloadUrlResponse.text()).toBe(true);
  const download = dataOf<{ downloadUrl: string }>(await downloadUrlResponse.json());
  const objectDownload = await request.get(download.downloadUrl);
  expect(objectDownload.ok(), await objectDownload.text()).toBe(true);
  expect(await objectDownload.body()).toEqual(PNG_BYTES);
}

test.describe('W2-004 Assets file lifecycle UI', () => {
  test.setTimeout(60000);

  test.beforeAll(async () => {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await seedAuthFixture();
  });

  test('uploads, finalizes, and attaches READY asset photo evidence on localhost', async ({
    page,
    request,
  }) => {
    const fixture = await createAssetFixture(request);
    await runDirectFileLifecycleSmoke(request, fixture.headers, fixture.asset.id);
    await installToken(page);

    const assetsResponse = page.waitForResponse((res) => {
      const url = new URL(res.url());
      return url.pathname === '/api/v1/assets' && res.ok();
    });
    await page.goto('/assets');
    await assetsResponse;

    const card = page.getByTestId(`asset-card-${fixture.asset.id}`);
    await expect(card.getByText(fixture.assetName)).toBeVisible();
    await expect(card.getByText('0 READY refs')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'w2-004-assets-before-upload.png'),
      fullPage: true,
    });

    const finalizePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/file-storage/finalize') &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
    const patchPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/v1/assets/${fixture.asset.id}`) &&
        res.request().method() === 'PATCH' &&
        res.ok(),
    );

    await page.getByTestId(`asset-photo-upload-${fixture.asset.id}-input`).setInputFiles({
      name: 'ui-asset-photo.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });

    await finalizePromise;
    await patchPromise;
    await expect(card.getByText('1 READY refs')).toBeVisible();

    const persistedResponse = await request.get(`${API_BASE}/api/v1/assets/${fixture.asset.id}`, {
      headers: fixture.headers,
    });
    expect(persistedResponse.ok(), await persistedResponse.text()).toBe(true);
    expect(dataOf<AssetResponse>(await persistedResponse.json()).photoFileRefIds).toHaveLength(1);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'w2-004-assets-after-upload.png'),
      fullPage: true,
    });
  });
});
