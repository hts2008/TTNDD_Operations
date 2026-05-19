import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const WEB_BASE = process.env.BASE_URL ?? 'http://localhost:3101';
const ADMIN_TOKEN = 'dev:p0p1-browser-admin';
const ARTIFACT_DIR = path.join(process.cwd(), 'docs', 'artifacts', 'w2-003-approval-ui');

interface ApiEnvelope<T> {
  data: T;
}

interface TicketResponse {
  id: string;
  title: string;
}

async function createApprovalFixture(request: APIRequestContext) {
  const title = `W2 Approval UI smoke ${Date.now()}`;
  const headers = {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };

  const ticketResponse = await request.post(`${API_BASE}/api/v1/tickets`, {
    headers,
    data: {
      title,
      description: 'Localhost browser smoke for Approval v2 stepper and timeline.',
      category: 'Finance',
      priority: 'medium',
      tags: ['w2', 'approval-ui'],
    },
  });
  expect(ticketResponse.ok(), await ticketResponse.text()).toBe(true);
  const ticketBody = (await ticketResponse.json()) as ApiEnvelope<TicketResponse>;

  const approvalResponse = await request.post(
    `${API_BASE}/api/v1/tickets/${ticketBody.data.id}/approval`,
    {
      headers,
      data: {
        approvalType: 'budget',
        amount: 2400000,
        notes: 'W2 UI should render the real multi-step approval journey.',
        steps: [
          { stepName: 'Finance review', approverRole: 'admin', dueInHours: 24 },
          { stepName: 'Council approval', approverRole: 'admin', dueInHours: 48 },
          { stepName: 'Final command', approverRole: 'admin', dueInHours: 72 },
        ],
      },
    },
  );
  expect(approvalResponse.ok(), await approvalResponse.text()).toBe(true);

  return { ticketId: ticketBody.data.id, title };
}

async function installToken(page: Page) {
  await page.context().addCookies([{ name: 'token', value: ADMIN_TOKEN, url: WEB_BASE }]);
  await page.addInitScript((token) => {
    window.localStorage.setItem('token', token);
  }, ADMIN_TOKEN);
}

test.describe('W2-003 Approval v2 UI', () => {
  test('renders approval stepper across approvals, tickets list, and ticket detail', async ({
    page,
    request,
  }) => {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    const fixture = await createApprovalFixture(request);
    await installToken(page);

    await page.goto('/approvals');
    await page.waitForResponse(
      (res) => res.url().includes(`/api/v1/tickets/${fixture.ticketId}/approval-flow`) && res.ok(),
    );

    const row = page.getByTestId(`approval-row-${fixture.ticketId}`);
    await expect(row.getByText(fixture.title)).toBeVisible();
    await expect(row.getByText('Finance review')).toBeVisible();
    await expect(row.getByText('Council approval')).toBeVisible();
    await expect(row.getByText('Final command')).toBeVisible();
    await expect(row.getByText('Step 1/3')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'w2-003-approvals-desktop.png'),
      fullPage: true,
    });

    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tickets/${fixture.ticketId}/approve`) &&
          res.request().method() === 'POST' &&
          res.ok(),
      ),
      row.getByRole('button', { name: 'Phe duyet' }).click(),
    ]);
    await page.waitForResponse(
      (res) => res.url().includes(`/api/v1/tickets/${fixture.ticketId}/approval-flow`) && res.ok(),
    );
    await expect(
      page.getByTestId(`approval-row-${fixture.ticketId}`).getByText('Step 2/3'),
    ).toBeVisible();

    await page.goto('/tickets');
    await page.waitForResponse((res) => res.url().includes('/api/v1/tickets') && res.ok());
    await expect(page.getByText(fixture.title)).toBeVisible();
    await expect(page.getByText('Step 2/3').first()).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'w2-003-tickets-list-desktop.png'),
      fullPage: true,
    });

    await page.goto(`/tickets/${fixture.ticketId}`);
    await page.waitForResponse(
      (res) => res.url().includes(`/api/v1/tickets/${fixture.ticketId}/approval-flow`) && res.ok(),
    );
    await expect(page.getByText(fixture.title)).toBeVisible();
    await expect(page.getByTestId('approval-flow-stepper')).toContainText('Finance review');
    await expect(page.getByTestId('approval-flow-stepper')).toContainText('Step 2/3');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'w2-003-ticket-detail-desktop.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/approvals');
    await page.waitForResponse(
      (res) => res.url().includes(`/api/v1/tickets/${fixture.ticketId}/approval-flow`) && res.ok(),
    );
    await expect(
      page.getByTestId(`approval-row-${fixture.ticketId}`).getByText('Step 2/3'),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'w2-003-approvals-mobile.png'),
      fullPage: true,
    });
  });
});
