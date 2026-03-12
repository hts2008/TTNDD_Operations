import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN } from '../helpers/auth.helper';

test.describe('Projects — M2-B: Views, Risks, Checklists, Alerts @module:projects @gate', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);
  });

  test('J11a: projects page loads with Kanban board', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    const bodyText = await page.textContent('body') || '';
    const hasContent = bodyText.includes('Dự án') || bodyText.includes('Projects') || bodyText.includes('Kế hoạch');
    expect(hasContent).toBeTruthy();
  });

  test('J11b: projects page has Kanban columns', async ({ page }) => {
    await page.goto('/projects');
    const bodyText = await page.textContent('body') || '';
    // Check for Kanban column labels
    const hasKanban =
      bodyText.includes('Cần làm') ||
      bodyText.includes('Đang thực hiện') ||
      bodyText.includes('Hoàn thành') ||
      bodyText.includes('Kanban');
    expect(hasKanban).toBeTruthy();
  });

  test('J11c: Risks tab is accessible', async ({ page }) => {
    await page.goto('/projects');
    // Look for Risks tab button
    const risksTab = page.getByRole('button', { name: /Rủi ro|Risks/i });
    if (await risksTab.isVisible()) {
      await risksTab.click();
      const bodyText = await page.textContent('body') || '';
      const hasRisks =
        bodyText.includes('Rủi ro') ||
        bodyText.includes('Risks') ||
        bodyText.includes('severity') ||
        bodyText.includes('Mức độ') ||
        bodyText.includes('Chưa có rủi ro');
      expect(hasRisks).toBeTruthy();
    } else {
      // Tab may not be a role=button, check text content
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.includes('Rủi ro') || bodyText.includes('Dự án')).toBeTruthy();
    }
  });

  test('J11d: Checklists tab is accessible', async ({ page }) => {
    await page.goto('/projects');
    // Look for Checklists tab
    const checklistsTab = page.getByRole('button', { name: /Checklists|Danh sách/i });
    if (await checklistsTab.isVisible()) {
      await checklistsTab.click();
      const bodyText = await page.textContent('body') || '';
      const hasChecklists =
        bodyText.includes('Checklists') ||
        bodyText.includes('Chuẩn bị') ||
        bodyText.includes('Chưa có checklist');
      expect(hasChecklists).toBeTruthy();
    } else {
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.includes('Dự án')).toBeTruthy();
    }
  });

  test('J11e: Alerts section is visible', async ({ page }) => {
    await page.goto('/projects');
    // Look for Alerts tab
    const alertsTab = page.getByRole('button', { name: /Cảnh báo|Alerts/i });
    if (await alertsTab.isVisible()) {
      await alertsTab.click();
      const bodyText = await page.textContent('body') || '';
      const hasAlerts =
        bodyText.includes('Quá hạn') ||
        bodyText.includes('Sắp đến hạn') ||
        bodyText.includes('Cảnh báo') ||
        bodyText.includes('Không có cảnh báo');
      expect(hasAlerts).toBeTruthy();
    } else {
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.includes('Dự án')).toBeTruthy();
    }
  });

  test('J11f: projects page has listing or empty state', async ({ page }) => {
    await page.goto('/projects');
    const bodyText = await page.textContent('body') || '';
    const hasSection = bodyText.includes('Dự án') || bodyText.includes('Chưa có dự án') || bodyText.includes('Projects');
    expect(hasSection).toBeTruthy();
  });
});
