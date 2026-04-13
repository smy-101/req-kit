import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('响应截断警告', () => {
  test('超大响应显示截断警告', async ({ page }) => {
    await page.goto('/');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/oversized`, '200');

    await expect(page.locator('.response-warning')).toBeVisible();
    await expect(page.locator('.response-warning')).toContainText('Response truncated');
  });
});
