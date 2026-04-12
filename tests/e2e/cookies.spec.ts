import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, waitForModal, waitForModalClose } from './helpers/wait';

test.describe('Cookie 管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Cookie 管理弹窗打开', async ({ page }) => {
    await page.locator('#btn-manage-cookies').click();

    await waitForModal(page);
    await expect(page.locator('#modal h3')).toHaveText('管理 Cookies');
  });

  test('Cookie 管理弹窗显示空状态', async ({ page }) => {
    await page.request.delete('/api/cookies');
    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    await expect(page.locator('.cookie-empty-msg')).toBeVisible();
  });

  test('发送请求后 Cookie 数量更新', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?test_cookie=test_value`, '200');
    await expect(page.locator('#cookie-count')).toBeVisible();
  });

  test('关闭 Cookie 管理弹窗', async ({ page }) => {
    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    await page.locator('#close-cookie-modal').click();
    await waitForModalClose(page);
  });
});

test.describe('Cookie 管理高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/response-headers?Set-Cookie=test1=value1`, '200');
  });

  test('Cookie 域名分组折叠/展开', async ({ page }) => {
    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    const domainGroups = page.locator('.cookie-domain-group');
    await expect(domainGroups.first()).toBeVisible();

    const domainHeader = page.locator('.cookie-domain-header').first();
    await domainHeader.click();
    await expect(domainGroups.first()).toHaveClass(/collapsed/);

    await domainHeader.click();
    await expect(domainGroups.first()).not.toHaveClass(/collapsed/);

    await page.locator('#close-cookie-modal').click();
  });

  test('按域名清除 Cookie', async ({ page }) => {
    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    const domainGroups = page.locator('.cookie-domain-group');
    await expect(domainGroups.first()).toBeVisible();

    const clearDomainBtn = page.locator('.cookie-domain-clear').first();
    await clearDomainBtn.click();

    await expect(page.locator('.cookie-item').filter({ hasText: 'test1' })).not.toBeVisible();

    await page.locator('#close-cookie-modal').click();
  });

  test('清除所有 Cookie 按钮', async ({ page }) => {
    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    await expect(page.locator('#clear-all-cookies')).toBeVisible();

    await page.locator('#close-cookie-modal').click();
  });

  test('Cookie 管理弹窗显示 Cookie 总数', async ({ page }) => {
    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    await expect(page.locator('.cookie-modal-total')).toBeVisible();

    await page.locator('#close-cookie-modal').click();
  });
});
