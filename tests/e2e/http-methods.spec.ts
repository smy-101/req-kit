import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('HTTP 方法测试', () => {
  test('HEAD 请求', async ({ page }) => {
    await page.goto('/');

    // 切换到 HEAD 方法
    await page.locator('#method-select').selectOption('HEAD');
    await expect(page.locator('#method-select')).toHaveValue('HEAD');

    // 发送 HEAD 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // HEAD 请求应该没有响应体或响应体为空
    const responseBody = page.locator('#response-format-content');
    const bodyText = await responseBody.textContent();
    expect(bodyText).toBeFalsy();
  });

  test('PATCH 请求', async ({ page }) => {
    await page.goto('/');

    // 切换到 PATCH 方法
    await page.locator('#method-select').selectOption('PATCH');
    await expect(page.locator('#method-select')).toHaveValue('PATCH');

    // 发送 PATCH 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/patch`, '200');

    // 验证响应包含请求信息
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('patch', { timeout: 5000 });
  });
});
