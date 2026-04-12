import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchResponseTab, waitForModal, waitForModalClose } from './helpers/wait';

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

test.describe('Cookie 高级管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('删除单个 Cookie', async ({ page }) => {
    // 先清除所有已有 cookie，确保干净状态
    await page.request.delete('/api/cookies');

    // 增加超时避免不稳定
    await page.locator('#request-options-btn').click();
    await page.locator('#request-timeout-input').fill('60000');

    // 设置 cookie（使用唯一名称避免冲突）
    const ck = `ck_del_${Date.now()}`;
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?${ck}=v1`, '200');

    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);

    // 等待 cookie 列表加载
    await expect(page.locator('.cookie-item').first()).toBeVisible({ timeout: 5000 });

    // 确认目标 cookie 存在
    await expect(page.locator('.cookie-item').filter({ hasText: ck })).toBeVisible({ timeout: 5000 });

    // 删除 cookie
    await page.locator('.cookie-item-delete').first().click();

    // 等待该 cookie 消失
    await expect(page.locator('.cookie-item').filter({ hasText: ck })).not.toBeVisible({ timeout: 5000 });
  });

  test('Cookie 管理弹窗总数显示', async ({ page }) => {
    // 增加超时避免不稳定
    await page.locator('#request-options-btn').click();
    await page.locator('#request-timeout-input').fill('60000');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?count_test=yes`, '200');

    await page.locator('#btn-manage-cookies').click();
    await waitForModal(page);
    await expect(page.locator('.cookie-modal-total')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Cookie 标签页渲染', () => {
  test('响应 Set-Cookie 在 Cookie 标签页正确显示', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?flavor=chocolate&brand=cookies-r-us`, '200');

    await switchResponseTab(page, 'cookies');
    const cookiesContent = page.locator('#response-cookies');
    await expect(cookiesContent).toBeVisible();
    await expect(cookiesContent).toContainText('flavor');
    await expect(cookiesContent).toContainText('chocolate');
  });
});
