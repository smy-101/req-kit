import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';

test.describe('自动取消上一个请求', () => {
  let rp: RequestPage;
  let resp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
    resp = new ResponsePage(page);
  });

  test('取消进行中的请求显示取消状态', async ({ page }) => {
    // 发送一个慢请求（5秒延迟）
    await rp.setMockUrl('/delay/5');
    await rp.clickSend();

    // 验证按钮变为加载状态
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'true');

    // 点击取消
    await rp.clickSend();

    // 验证请求被取消 — 按钮恢复为 Send 状态
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'false');
  });

  test('Send 按钮在请求中变为取消按钮，完成后恢复', async ({ page }) => {
    await rp.setMockUrl('/delay/2');
    await rp.clickSend();

    // 请求中：按钮变为 loading 状态
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'true');
    await expect(rp.sendBtn).toContainText('Cancel');

    // 等待完成
    await resp.waitForStatus('200');

    // 完成后：按钮恢复
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'false');
    await expect(rp.sendBtn).toContainText('Send');
  });
});
