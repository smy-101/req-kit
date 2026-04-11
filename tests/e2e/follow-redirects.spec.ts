import { test, expect } from '@playwright/test';

test.describe('关闭 Follow Redirects', () => {
  test('关闭重定向后收到 3xx 响应', async ({ page }) => {
    await page.goto('/');

    // 先填写 URL
    await page.locator('#url-input').fill('https://httpbin.org/redirect/1');
    await page.waitForTimeout(200);

    // 关闭 Follow Redirects
    await page.locator('#request-options-btn').click();
    await page.waitForTimeout(200);
    await page.locator('.request-options-switch').click();
    await page.waitForTimeout(200);

    // 确认 URL 仍然存在
    await expect(page.locator('#url-input')).toHaveValue('https://httpbin.org/redirect/1');

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
    await page.locator('#url-input').fill('https://httpbin.org/redirect/1');
    await page.locator('#send-btn').click();

    // 应自动跟随到最终 200
    await expect(page.locator('#response-status')).toContainText('200');
  });
});
