import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';

test.describe('网络错误处理', () => {
  let rp: RequestPage;
  let resp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
    resp = new ResponsePage(page);
  });

  test('连接拒绝显示错误状态', async ({ page }) => {
    // 使用不可达端口触发连接拒绝
    await rp.setUrl('http://127.0.0.1:1/get');
    await rp.clickSend();

    // 应显示 Error 状态
    await expect(resp.statusEl).toContainText('Error', { timeout: 10000 });
  });

  test('无效 URL 显示错误', async ({ page }) => {
    await rp.setUrl('not-a-valid-url');
    await rp.clickSend();

    await expect(resp.statusEl).toContainText('Error', { timeout: 10000 });
  });

  test('DNS 解析失败显示错误', async ({ page }) => {
    await rp.setUrl('http://this-domain-does-not-exist-xyz123.invalid/get');
    await rp.clickSend();

    await expect(resp.statusEl).toContainText('Error', { timeout: 10000 });
  });

  test('快速多次点击发送按钮只处理一个请求', async ({ page }) => {
    await rp.setMockUrl('/delay/1');

    // 快速点击发送 5 次
    for (let i = 0; i < 5; i++) {
      await rp.sendBtn.click();
    }

    // 等待响应
    await resp.waitForStatus('200', { timeout: 10000 });

    // 按钮应恢复为 Send 状态
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'false');
    await expect(rp.sendBtn).toContainText('Send');
  });
});
