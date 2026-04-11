import { test, expect } from '@playwright/test';

test.describe('请求超时行为', () => {
  test('请求超时后显示错误状态', async ({ page }) => {
    await page.goto('/');

    // 设置超时为 1 秒
    await page.locator('#request-options-btn').click();
    const timeoutInput = page.locator('#request-timeout-input');
    await timeoutInput.fill('1000');
    await page.waitForTimeout(200);

    // 发送到需要 5 秒的延迟端点
    await page.locator('#url-input').fill('https://httpbin.org/delay/5');
    await page.locator('#send-btn').click();

    // 应显示 5xx 错误状态样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/, { timeout: 15000 });
    // 时间和大小显示为异常值
    await expect(page.locator('#response-time')).toBeVisible();
  });

  test('正常请求在超时时间内完成', async ({ page }) => {
    await page.goto('/');

    // 设置超时为 10 秒
    await page.locator('#request-options-btn').click();
    const timeoutInput = page.locator('#request-timeout-input');
    await timeoutInput.fill('10000');
    await page.waitForTimeout(200);

    // 发送到 2 秒延迟端点 — 应在 10 秒超时内完成
    await page.locator('#url-input').fill('https://httpbin.org/delay/2');
    await page.locator('#send-btn').click();

    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });
  });
});
