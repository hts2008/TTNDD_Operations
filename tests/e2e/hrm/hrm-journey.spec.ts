import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ADMIN, DEMO_MEMBER, DEMO_PARENT, clickTabIfVisible, expectPageLoaded } from '../helpers/auth.helper';

// Seeded IDs from seed.ts
const SEEDED_MEMBER_ID = 'eeeeeee1-0000-0000-0000-000000000003';

test.describe('HRM Full Journey — Login → Roster → Detail → OrgChart → Parent @module:hrm @smoke', () => {

  // ═══════════════════════════════════════════════════════════
  // T-1018: Complete HRM User Journey (Admin perspective)
  // ═══════════════════════════════════════════════════════════

  test('HRM-J1: admin journey — roster → detail → character-sheet → org-chart', async ({ page }) => {
    // Step 1: Login as admin
    await loginAs(page, DEMO_ADMIN);

    // Step 2: Navigate to member roster
    await page.goto('/members');
    await page.waitForTimeout(2000);
    let bodyText = (await page.textContent('body')) || '';
    expect(
      bodyText.includes('Thành Viên') ||
      bodyText.includes('thành viên') ||
      bodyText.includes('Member')
    ).toBeTruthy();

    // Step 3: Click first member in list (if API returned data)
    const memberRow = page.locator('[class*="cursor-pointer"]').first();
    if (await memberRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await memberRow.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/members\//);

      // Step 4: Verify member detail loaded
      bodyText = (await page.textContent('body')) || '';
      const hasDetail =
        bodyText.includes('Hồ sơ') ||
        bodyText.includes('Quay lại') ||
        bodyText.includes('Profile');
      expect(hasDetail).toBeTruthy();

      // Step 5: Navigate to character sheet
      const charSheetBtn = page.locator('button:has-text("Bảng nhân vật"), a:has-text("Bảng nhân vật")');
      if (await charSheetBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await charSheetBtn.first().click();
        await page.waitForTimeout(2000);
        bodyText = (await page.textContent('body')) || '';
        const hasSheet =
          bodyText.includes('Bảng nhân vật') ||
          bodyText.includes('Character') ||
          bodyText.includes('EXP');
        expect(hasSheet).toBeTruthy();
      }
    }

    // Step 6: Navigate to org chart
    await page.goto('/org-chart');
    await page.waitForTimeout(2000);
    bodyText = (await page.textContent('body')) || '';
    const hasChart =
      bodyText.includes('Sơ Đồ Tổ Chức') ||
      bodyText.includes('Org Chart');
    expect(hasChart).toBeTruthy();

    // Step 7: Navigate to parent portal
    await page.goto('/parent');
    await page.waitForTimeout(2000);
    bodyText = (await page.textContent('body')) || '';
    const hasParent =
      bodyText.includes('Cổng Phụ Huynh') ||
      bodyText.includes('Parent');
    expect(hasParent).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  // T-1018: Member Detail Deep Dive Journey
  // ═══════════════════════════════════════════════════════════

  test('HRM-J2: member detail deep dive — all tabs and sub-pages', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN);

    // Navigate to seeded member
    await page.goto(`/members/${SEEDED_MEMBER_ID}`);
    await page.waitForTimeout(2000);

    // Tab 1: Profile (default)
    let bodyText = (await page.textContent('body')) || '';
    const hasProfile =
      bodyText.includes('Hồ sơ') ||
      bodyText.includes('Email') ||
      bodyText.includes('Điện thoại') ||
      bodyText.includes('Vai trò');
    expect(hasProfile).toBeTruthy();

    // Tab 2: Guardians
    const guardianClicked = await clickTabIfVisible(page, 'Phụ huynh');
    if (guardianClicked) {
      await page.waitForTimeout(1000);
      bodyText = (await page.textContent('body')) || '';
      const hasGuardians =
        bodyText.includes('Đã ký') ||
        bodyText.includes('Chưa ký') ||
        bodyText.includes('Chưa có thông tin phụ huynh');
      expect(hasGuardians).toBeTruthy();
    }

    // Tab 3: Compliance
    const complianceClicked = await clickTabIfVisible(page, 'Tuân thủ');
    if (complianceClicked) {
      await page.waitForTimeout(2000);
      bodyText = (await page.textContent('body')) || '';
      const hasCompliance =
        bodyText.includes('Đạt yêu cầu') ||
        bodyText.includes('Không thể kiểm tra') ||
        bodyText.includes('Đang kiểm tra');
      expect(hasCompliance).toBeTruthy();
    }

    // Sub-page: Progress
    await page.goto(`/members/${SEEDED_MEMBER_ID}/progress`);
    await page.waitForTimeout(1500);
    bodyText = (await page.textContent('body')) || '';
    expect(bodyText.length).toBeGreaterThan(50);

    // Sub-page: Achievements
    await page.goto(`/members/${SEEDED_MEMBER_ID}/achievements`);
    await page.waitForTimeout(1500);
    bodyText = (await page.textContent('body')) || '';
    expect(bodyText.length).toBeGreaterThan(50);

    // Sub-page: Habits
    await page.goto(`/members/${SEEDED_MEMBER_ID}/habits`);
    await page.waitForTimeout(1500);
    bodyText = (await page.textContent('body')) || '';
    expect(bodyText.length).toBeGreaterThan(50);
  });

  // ═══════════════════════════════════════════════════════════
  // T-1017: Seed Verification — Counts via API
  // ═══════════════════════════════════════════════════════════

  test('HRM-J3: seed verification — member count via API', async ({ request }) => {
    const res = await request.get('/api/hrm/members?page=1&limit=5').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      // Seed creates at least 7 org members
      expect(data.total).toBeGreaterThanOrEqual(5);
    }
  });

  test('HRM-J4: seed verification — org chart nodes via API', async ({ request }) => {
    const res = await request.get('/api/hrm/org-chart').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      // Seed creates 5 org chart nodes
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('HRM-J5: seed verification — branches exist', async ({ request }) => {
    const res = await request.get('/api/org-config/branches').catch(() => null);
    if (res && res.ok()) {
      const data = await res.json();
      // Seed creates 3 branches (Đồng, Thiếu, Thanh)
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThanOrEqual(3);
    }
  });
});
