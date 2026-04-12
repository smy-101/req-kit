import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('关闭 Follow Redirects', () => {
  test('关闭重定向后收到 3xx 响应', async ({ page }) => {
    await page.goto('/');

    // 先填写 URL
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/redirect/1`);

    // 关闭 Follow Redirects
    await page.locator('#request-options-btn').click();
    await page.locator('.request-options-switch').click();

    // 确认 URL 仍然存在
    await expect(page.locator('#url-input')).toHaveValue(`${MOCK_BASE_URL}/redirect/1`);

    // 发送请求
    await page.locator('#send-btn').click();

    // 应收到 302 而不是 200（redirect: 'manual' 返回原始重定向响应）
    await expect(page.locator('#response-status')).toContainText('302');
  });

  test('开启重定向时自动跟随 302', async ({ page }) => {
    await page.goto('/');

    // 确认 Follow Redirects 默认开启
    await page.locator('#request-options-btn').click();
    await expect(page.locator('#request-redirect-toggle')).toBeChecked();

    // 发送到重定向端点
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/redirect/1`, '200');
  });
});
