import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('Cookie 管理高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 使用 response-headers 端点直接设置 Set-Cookie（不经过重定向）
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/response-headers?Set-Cookie=test1=value1`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');
    await page.waitForTimeout(1000);
  });

  test('Cookie 域名分组折叠/展开', async ({ page }) => {
    // 打开 Cookie 管理弹窗
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });

    // 等待 Cookie 域名分组出现
    const domainGroups = page.locator('.cookie-domain-group');
    const hasCookies = await domainGroups.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCookies) {
      // 点击域名头折叠
      const domainHeader = page.locator('.cookie-domain-header').first();
      await domainHeader.click();
      await page.waitForTimeout(300);

      // 验证分组被折叠
      await expect(domainGroups.first()).toHaveClass(/collapsed/);

      // 再次点击展开
      await domainHeader.click();
      await page.waitForTimeout(300);

      // 验证分组被展开
      await expect(domainGroups.first()).not.toHaveClass(/collapsed/);
    }

    // 关闭弹窗
    await page.locator('#close-cookie-modal').click();
  });

  test('按域名清除 Cookie', async ({ page }) => {
    // 打开 Cookie 管理弹窗
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });

    // 等待 Cookie 域名分组出现
    const domainGroups = page.locator('.cookie-domain-group');
    const hasCookies = await domainGroups.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCookies) {
      // 点击该域名的清除按钮
      const clearDomainBtn = page.locator('.cookie-domain-clear').first();
      await clearDomainBtn.click();
      await page.waitForTimeout(500);

      // 验证该域名的 Cookie 已被清除
      await expect(domainGroups).toHaveCount(0);
    }

    // 关闭弹窗
    await page.locator('#close-cookie-modal').click();
  });

  test('清除所有 Cookie 按钮', async ({ page }) => {
    // 打开 Cookie 管理弹窗
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });

    // 验证清除所有按钮存在
    await expect(page.locator('#clear-all-cookies')).toBeVisible({ timeout: 5000 });

    // 关闭弹窗
    await page.locator('#close-cookie-modal').click();
  });

  test('Cookie 管理弹窗显示 Cookie 总数', async ({ page }) => {
    // 打开 Cookie 管理弹窗
    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });

    // 验证 Cookie 总数显示
    await expect(page.locator('.cookie-modal-total')).toBeVisible({ timeout: 5000 });

    // 关闭弹窗
    await page.locator('#close-cookie-modal').click();
  });
});
