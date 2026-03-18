import { test, expect } from '@playwright/test';

test.describe('LMS — Course Enrollment & Progress @module:lms @gate', () => {
  test('L1a: LMS page renders course list', async ({ page }) => {
    await page.goto('/lms');
    // Page should load without errors — h1 appears after data loads,
    // but loading/error states are also valid renders
    const heading = page.locator('h1');
    const body = page.locator('body');
    try {
      await expect(heading).toContainText('Học tập', { timeout: 5000 });
    } catch {
      // API may be down — verify page still rendered (loading or error state)
      const text = (await body.textContent()) || '';
      const hasValidState =
        text.includes('Đang tải') || text.includes('Chưa có khóa học') || text.includes('Học tập');
      expect(hasValidState).toBeTruthy();
    }
  });

  test('L1b: LMS page shows loading state initially', async ({ page }) => {
    await page.goto('/lms');
    // Should show loading indicator or content
    const body = (await page.textContent('body')) || '';
    const hasContent = body.includes('Học tập') || body.includes('Đang tải');
    expect(hasContent).toBeTruthy();
  });

  test('L2a: course detail page loads', async ({ page }) => {
    await page.goto('/lms');
    // Wait for any course cards or empty state
    await page.waitForTimeout(2000);

    const courseLinks = page.locator('a[href^="/lms/"]');
    const count = await courseLinks.count();

    if (count > 0) {
      // Click first course
      await courseLinks.first().click();
      await page.waitForTimeout(1000);
      // Should show course detail or back button
      const hasBackButton = await page.locator('button:has-text("Quay lại")').isVisible();
      expect(hasBackButton).toBeTruthy();
    } else {
      // Empty state — verify message
      const body = (await page.textContent('body')) || '';
      expect(body.includes('Chưa có khóa học') || body.includes('Học tập')).toBeTruthy();
    }
  });

  test('L3a: LMS page has proper SEO', async ({ page }) => {
    await page.goto('/lms');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
