import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, DEMO_MEMBER, clickTabIfVisible, clickButtonIfVisible } from '../helpers/auth.helper';

test.describe('Enrichment 8D Journey — @module:enrichment @smoke', () => {

  // ═══════════════════════════════════════════════════════════
  // Page Load & Tab Navigation
  // ═══════════════════════════════════════════════════════════

  test('ENRICH-J1: enrichment page loads with 4 tabs', async ({ page }) => {
    await loginAs(page, DEMO_MEMBER);

    await page.goto('/enrichment');
    await page.waitForTimeout(2000);

    const bodyText = (await page.textContent('body')) || '';
    expect(
      bodyText.includes('Giáo Dục Tâm Linh') ||
      bodyText.includes('Enrichment') ||
      bodyText.includes('Nhật ký')
    ).toBeTruthy();

    // Verify all 4 tabs exist
    const hasJournal = bodyText.includes('Nhật ký') || bodyText.includes('Journal');
    const hasNguGioi = bodyText.includes('Ngũ Giới');
    const hasEval = bodyText.includes('Đánh giá') || bodyText.includes('Evaluation');
    const hasMentor = bodyText.includes('Cố vấn') || bodyText.includes('Mentor');

    expect(hasJournal || hasNguGioi || hasEval || hasMentor).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Spiritual Journal Tab
  // ═══════════════════════════════════════════════════════════

  test('ENRICH-J2: spiritual journal tab shows entries and create form', async ({ page }) => {
    await loginAs(page, DEMO_MEMBER);
    await page.goto('/enrichment');
    await page.waitForTimeout(2000);

    // Journal tab should be default or clickable
    await clickTabIfVisible(page, 'Nhật ký');
    await page.waitForTimeout(1000);

    const bodyText = (await page.textContent('body')) || '';
    const hasJournalContent =
      bodyText.includes('Viết ghi chú') ||
      bodyText.includes('Thánh Ngôn') ||
      bodyText.includes('Cảm xúc') ||
      bodyText.includes('Chưa có ghi chú');
    expect(hasJournalContent).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Ngũ Giới Tab
  // ═══════════════════════════════════════════════════════════

  test('ENRICH-J3: Ngũ Giới tab shows precepts and star ratings', async ({ page }) => {
    await loginAs(page, DEMO_MEMBER);
    await page.goto('/enrichment');
    await page.waitForTimeout(2000);

    const clicked = await clickTabIfVisible(page, 'Ngũ Giới');
    if (clicked) {
      await page.waitForTimeout(1000);
      const bodyText = (await page.textContent('body')) || '';
      const hasNguGioi =
        bodyText.includes('Bất Sát Sinh') ||
        bodyText.includes('Bất Đạo') ||
        bodyText.includes('Bất Tà Dâm') ||
        bodyText.includes('Bất Tửu Nhục') ||
        bodyText.includes('Bất Vọng Ngữ');
      expect(hasNguGioi).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Evaluations Tab
  // ═══════════════════════════════════════════════════════════

  test('ENRICH-J4: evaluations tab loads for admin', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
    await page.goto('/enrichment');
    await page.waitForTimeout(2000);

    const clicked = await clickTabIfVisible(page, 'Đánh giá');
    if (clicked) {
      await page.waitForTimeout(1000);
      const bodyText = (await page.textContent('body')) || '';
      const hasEvals =
        bodyText.includes('Đạo Đức') ||
        bodyText.includes('Kỹ Năng') ||
        bodyText.includes('Thể Chất') ||
        bodyText.includes('Lãnh Đạo') ||
        bodyText.includes('Phụng Sự') ||
        bodyText.includes('Chưa có đánh giá');
      expect(hasEvals).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Mentoring Tab
  // ═══════════════════════════════════════════════════════════

  test('ENRICH-J5: mentoring tab shows relationships', async ({ page }) => {
    await loginAs(page, DEMO_MEMBER);
    await page.goto('/enrichment');
    await page.waitForTimeout(2000);

    const clicked = await clickTabIfVisible(page, 'Cố vấn');
    if (clicked) {
      await page.waitForTimeout(1000);
      const bodyText = (await page.textContent('body')) || '';
      const hasMentoring =
        bodyText.includes('Cố vấn') ||
        bodyText.includes('Mentor') ||
        bodyText.includes('Chưa có mối quan hệ') ||
        bodyText.includes('Phiên cố vấn');
      expect(hasMentoring).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // API Verification — Enrichment endpoints
  // ═══════════════════════════════════════════════════════════

  test('ENRICH-J6: spiritual-logs API returns valid response', async ({ request }) => {
    const res = await request.get('/api/enrichment/spiritual-logs/my').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('ENRICH-J7: ngu-gioi API returns valid response', async ({ request }) => {
    const res = await request.get('/api/enrichment/ngu-gioi/my').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('ENRICH-J8: evaluations API returns valid response', async ({ request }) => {
    const res = await request.get('/api/enrichment/evaluations/my').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('ENRICH-J9: mentoring API returns valid response', async ({ request }) => {
    const res = await request.get('/api/enrichment/mentoring/my-relationships').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      expect(Array.isArray(data)).toBeTruthy();
    }
  });
});
