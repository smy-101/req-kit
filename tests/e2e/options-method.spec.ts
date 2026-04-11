import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('OPTIONS 方法请求', () => {
  test('发送 OPTIONS 请求并验证响应', async ({ page }) => {
    await page.goto('/');

    await page.locator('#method-select').selectOption('OPTIONS');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/anything`);

    await page.locator('#send-btn').click();

    // 验证 OPTIONS 请求成功返回 200
    await expect(page.locator('#response-status')).toContainText('200');
    await expect(page.locator('#response-time')).toBeVisible();
  });
});
