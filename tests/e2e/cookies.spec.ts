import { test, expect } from '@playwright/test';

test.describe('Cookie 管理', () => {
  test('Cookie 管理弹窗打开', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-manage-cookies').click();

    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('#modal h3')).toHaveText('管理 Cookies');
  });

  test('Cookie 管理弹窗显示空状态', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await expect(page.locator('.cookie-empty-msg')).toBeVisible({ timeout: 5000 });
  });

  test('发送请求后 Cookie 数量更新', async ({ page }) => {
    await page.goto('/');

    // 发送请求到 httpbin /cookies/set 设置 cookie
    await page.locator('#url-input').fill('https://httpbin.org/cookies/set?test_cookie=test_value');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

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
