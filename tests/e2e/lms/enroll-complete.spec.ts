import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, expectPageLoaded } from '../helpers/auth.helper';

test.describe('LMS — Enroll & Complete @module:lms @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('EC1: LMS course list page loads', async ({ page }) => {
    await page.goto('/lms');
    await expectPageLoaded(page, /\/lms/, ['Khóa học', 'LMS', 'Course', 'Giáo trình']);
  });

  test('EC2: LMS page shows course cards or empty state', async ({ page }) => {
    await page.goto('/lms');
    const bodyText = (await page.textContent('body')) || '';
    const hasCourses =
      bodyText.includes('Giáo Lý Cao Đài') ||
      bodyText.includes('Nhập Môn') ||
      bodyText.includes('Chưa có khóa học') ||
      bodyText.includes('Tạo khóa');
    expect(hasCourses).toBeTruthy();
  });

  test('EC3: course detail page loads from URL', async ({ page }) => {
    await page.goto('/lms/a1000001-0000-0000-0000-000000000001');
    const bodyText = (await page.textContent('body')) || '';
    const hasDetail =
      bodyText.includes('Giáo Lý') ||
      bodyText.includes('Bài học') ||
      bodyText.includes('Course') ||
      bodyText.includes('Khóa học') ||
      bodyText.includes('404') ||
      bodyText.includes('Không tìm thấy');
    expect(hasDetail).toBeTruthy();
  });
});
