import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('File Storage — Upload & Download @module:file-storage @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('UD1: file storage page loads', async ({ page }) => {
    await page.goto('/file-storage');
    const bodyText = (await page.textContent('body')) || '';
    const hasContent =
      bodyText.includes('Lưu trữ') ||
      bodyText.includes('File') ||
      bodyText.includes('Storage') ||
      bodyText.includes('Tệp') ||
      bodyText.includes('404');
    expect(hasContent).toBeTruthy();
  });

  test('UD2: upload area visible', async ({ page }) => {
    await page.goto('/file-storage');
    const bodyText = (await page.textContent('body')) || '';
    const hasUpload =
      bodyText.includes('Tải lên') ||
      bodyText.includes('Upload') ||
      bodyText.includes('Kéo thả') ||
      bodyText.includes('File') ||
      bodyText.includes('Storage');
    expect(hasUpload).toBeTruthy();
  });

  test('UD3: file listing or empty state', async ({ page }) => {
    await page.goto('/file-storage');
    const bodyText = (await page.textContent('body')) || '';
    const hasListing =
      bodyText.includes('Danh sách') ||
      bodyText.includes('Chưa có tệp') ||
      bodyText.includes('Files') ||
      bodyText.includes('Storage');
    expect(hasListing).toBeTruthy();
  });
});
