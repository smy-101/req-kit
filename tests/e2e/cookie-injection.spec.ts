import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { CookiePage } from './pages/cookie-page';

test.describe('Cookie 自动注入', () => {
  let rp: RequestPage;
  let cookiePage: CookiePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
    cookiePage = new CookiePage(page);
    // 清除所有已有 cookie，确保干净状态
    await page.request.delete('/api/cookies');
  });

  test('发送请求后 Set-Cookie 自动注入到后续请求', async ({ page }) => {
    // 第一步：发送请求设置 cookie
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?auto_key=auto_value`, '200');

    // 第二步：发送请求到同域，验证 cookie 自动注入
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    // mock server /get 回显所有请求头，应包含自动注入的 Cookie
    await expect(responseBody).toContainText('auto_key');
    await expect(responseBody).toContainText('auto_value');
  });

  test('多个 Cookie 同时注入', async ({ page }) => {
    // 设置两个 cookie
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?c1=v1&c2=v2`, '200');

    // 发送请求验证两个 cookie 都被注入
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('c1');
    await expect(responseBody).toContainText('v1');
    await expect(responseBody).toContainText('c2');
    await expect(responseBody).toContainText('v2');
  });

  test('用户手动设置的 Cookie 头优先于自动注入', async ({ page }) => {
    // 先设置一个自动注入的 cookie
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?auto_key=auto_val`, '200');

    // 手动设置 Cookie 头（会阻止自动注入）
    await rp.switchTab('headers');
    await rp.addHeaderRow('Cookie', 'manual=override');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    // 应包含手动设置的值
    await expect(responseBody).toContainText('manual=override');
    // 不应包含自动注入的 cookie（因为手动 Cookie 头优先）
    await expect(responseBody).not.toContainText('auto_key');
  });

  test('通过 Cookie 管理弹窗删除 Cookie 后不再注入', async ({ page }) => {
    const ck = `del_${Date.now()}`;
    // 设置 cookie
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?${ck}=del_val`, '200');

    // 验证 cookie 存在（能自动注入）
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('#response-format-content')).toContainText(ck);

    // 通过管理弹窗删除该 cookie（域名分组默认已展开，无需 expandDomain）
    await cookiePage.open();
    await cookiePage.deleteCookie(0);
    // 等待删除完成（列表重新加载）
    await expect(page.locator('.cookie-empty-msg, .cookie-item')).toBeVisible();
    // 刷新页面以重置 modal 栈状态（deleteCookie 后 Modal 栈有残留）
    await page.reload();
    rp = new RequestPage(page);

    // 再次发送请求，验证 cookie 不再被注入
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('#response-format-content')).not.toContainText(ck);
  });

  test('清除所有 Cookie 后不再注入', async ({ page }) => {
    const ck = `clear_${Date.now()}`;
    // 设置 cookie
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?${ck}=clear_val`, '200');

    // 验证 cookie 存在
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('#response-format-content')).toContainText(ck);

    // 清除所有 cookie（使用自定义 Dialogs.confirmDanger 弹窗，非原生 confirm）
    await cookiePage.open();
    await cookiePage.clearAllCookies();
    // 等待自定义确认弹窗出现
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    // 点击 "Delete" 按钮确认
    await page.locator('.confirm-dialog .modal-btn-danger').click();
    // 等待清空完成（弹窗关闭，列表重新渲染为空）
    await expect(page.locator('.cookie-empty-msg')).toBeVisible();
    // 刷新页面以重置 modal 栈状态（clearAllCookies 后 Modal 栈有残留）
    await page.reload();
    rp = new RequestPage(page);

    // 再次发送请求，验证 cookie 不再被注入
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('#response-format-content')).not.toContainText(ck);
  });
});
