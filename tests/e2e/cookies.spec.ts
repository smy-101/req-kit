import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { CookiePage } from './pages/cookie-page';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';

test.describe('Cookie 管理', () => {
  let cookiePage: CookiePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    cookiePage = new CookiePage(page);
  });

  test('Cookie 管理弹窗打开', async ({ page }) => {
    await cookiePage.open();

    await expect(cookiePage.modalTitle).toHaveText('管理 Cookies');
  });

  test('Cookie 管理弹窗显示空状态', async ({ page }) => {
    await page.request.delete('/api/cookies');
    await cookiePage.open();

    await expect(cookiePage.emptyMsg).toBeVisible();
  });

  test('发送请求后 Cookie 数量更新', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?test_cookie=test_value`, '200');
    await expect(cookiePage.countBadge).toBeVisible();
  });

  test('关闭 Cookie 管理弹窗', async ({ page }) => {
    await cookiePage.open();
    await cookiePage.close();
  });
});

test.describe('Cookie 管理高级功能', () => {
  let cookiePage: CookiePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    cookiePage = new CookiePage(page);
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/response-headers?Set-Cookie=test1=value1`, '200');
  });

  test('Cookie 域名分组折叠/展开', async ({ page }) => {
    await cookiePage.open();

    await expect(cookiePage.domainGroups.first()).toBeVisible();

    await cookiePage.collapseDomain();
    await cookiePage.expandDomain();

    await cookiePage.close();
  });

  test('按域名清除 Cookie', async ({ page }) => {
    await cookiePage.open();

    await expect(cookiePage.domainGroups.first()).toBeVisible();

    await cookiePage.clearDomainCookies();

    await expect(cookiePage.cookieItems.filter({ hasText: 'test1' })).not.toBeVisible();

    await cookiePage.close();
  });

  test('清除所有 Cookie 按钮', async ({ page }) => {
    await cookiePage.open();

    await expect(cookiePage.clearAllBtn).toBeVisible();

    await cookiePage.close();
  });

  test('Cookie 管理弹窗显示 Cookie 总数', async ({ page }) => {
    await cookiePage.open();

    await expect(cookiePage.totalBadge).toBeVisible();

    await cookiePage.close();
  });
});

test.describe('Cookie 高级管理', () => {
  let cookiePage: CookiePage;
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    cookiePage = new CookiePage(page);
    rp = new RequestPage(page);
  });

  test('删除单个 Cookie', async ({ page }) => {
    // 清除所有已有 cookie，确保干净状态
    await page.request.delete('/api/cookies');

    // 增加超时避免不稳定
    await rp.openOptions();
    await rp.setTimeout(60000);

    // 设置 cookie（使用唯一名称避免冲突）
    const ck = `ck_del_${Date.now()}`;
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?${ck}=v1`, '200');

    await cookiePage.open();

    // 等待 cookie 列表加载
    await expect(cookiePage.cookieItems.first()).toBeVisible({ timeout: 10000 });

    // 确认目标 cookie 存在
    await expect(cookiePage.cookieItems.filter({ hasText: ck })).toBeVisible({ timeout: 10000 });

    // 删除 cookie
    await cookiePage.deleteCookie(0);

    // 等待该 cookie 消失
    await expect(cookiePage.cookieItems.filter({ hasText: ck })).not.toBeVisible({ timeout: 10000 });
  });

  test('Cookie 管理弹窗总数显示', async ({ page }) => {
    // 增加超时避免不稳定
    await rp.openOptions();
    await rp.setTimeout(60000);

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?count_test=yes`, '200');

    await cookiePage.open();
    await expect(cookiePage.totalBadge).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Cookie 标签页渲染', () => {
  test('响应 Set-Cookie 在 Cookie 标签页正确显示', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?flavor=chocolate&brand=cookies-r-us`, '200');

    const responsePage = new ResponsePage(page);
    await responsePage.switchTab('cookies');
    await expect(responsePage.cookies).toBeVisible();
    await expect(responsePage.cookies).toContainText('flavor');
    await expect(responsePage.cookies).toContainText('chocolate');
  });
});
