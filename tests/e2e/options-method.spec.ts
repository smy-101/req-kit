import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('OPTIONS 方法请求', () => {
  test('发送 OPTIONS 请求并验证响应', async ({ page }) => {
    await page.goto('/');

    await page.locator('#method-select').selectOption('OPTIONS');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/anything`, '200');

    await expect(page.locator('#response-time')).toBeVisible();
  });
});
