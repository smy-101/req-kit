import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('请求取消', () => {
  test('发送按钮在请求中变为取消按钮', async ({ page }) => {
    await page.goto('/');

    // 发送请求到较慢的端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delay/5`);

    // 发送请求
    await page.locator('#send-btn').click();

    // 验证按钮变为取消状态
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'true', { timeout: 3000 });

    // 验证按钮显示 Cancel
    await expect(page.locator('#send-btn')).toContainText('Cancel');

    // 点击取消
    await page.locator('#send-btn').click();

    // 验证按钮恢复为 Send 状态
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'false', { timeout: 10000 });
    await expect(page.locator('#send-btn')).toContainText('Send');
  });

  test('取消请求后显示取消状态', async ({ page }) => {
    await page.goto('/');

    // 发送请求到较慢的端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delay/5`);
    await page.locator('#send-btn').click();

    // 等待取消按钮出现
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'true', { timeout: 3000 });

    // 点击取消
    await page.locator('#send-btn').click();

    // 验证按钮恢复
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'false', { timeout: 10000 });

    // 验证显示取消错误
    await expect(page.locator('.response-error')).toBeVisible({ timeout: 5000 });
  });
});
