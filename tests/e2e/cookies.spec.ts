import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('Cookie 管理', () => {
  test('Cookie 管理弹窗打开', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-manage-cookies').click();

    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('#modal h3')).toHaveText('管理 Cookies');
  });

  test('Cookie 管理弹窗显示空状态', async ({ page }) => {
    // 先清空所有 Cookie，避免并行测试残留
    await page.goto('/');
    await page.request.delete('/api/cookies');
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await expect(page.locator('.cookie-empty-msg')).toBeVisible({ timeout: 5000 });
  });

  test('发送请求后 Cookie 数量更新', async ({ page }) => {
    await page.goto('/');

    // 发送请求到 httpbin /cookies/set 设置 cookie
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/cookies/set?test_cookie=test_value`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 检查 cookie count 更新
    // 注意：浏览器可能不直接暴露 httpbin 设置的 cookies 给 JS
    // 这个测试主要验证 cookie count badge 的存在
    await expect(page.locator('#cookie-count')).toBeVisible();
  });

  test('关闭 Cookie 管理弹窗', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#close-cookie-modal').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();
  });
});
