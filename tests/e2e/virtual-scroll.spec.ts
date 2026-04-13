import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { ResponsePage } from './pages/response-page';

test.describe('虚拟滚动大响应', () => {
  let resp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    resp = new ResponsePage(page);
  });

  test('大 JSON 响应触发虚拟滚动', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/large-json`, '200');

    // 验证 .vs-active 类出现在 #response-body 上
    const bodyEl = page.locator('#response-body');
    await expect(bodyEl).toHaveClass(/vs-active/);

    // 验证虚拟滚动结构存在
    await expect(page.locator('#response-format-content .vscroll-wrapper')).toBeVisible();
    await expect(page.locator('#response-format-content .vscroll-viewport')).toBeVisible();
    await expect(page.locator('#response-format-content .vscroll-spacer')).toBeVisible();
  });

  test('虚拟滚动只渲染可见行', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/large-json`, '200');

    const bodyEl = page.locator('#response-body');
    await expect(bodyEl).toHaveClass(/vs-active/);

    // 计算可见 .vline 元素 — 应远少于总行数
    const visibleLines = page.locator('.vline');
    const lineCount = await visibleLines.count();

    // 总行数应为 1000+，但可见渲染行应 < 200
    expect(lineCount).toBeLessThan(200);
  });

  test('切换格式时虚拟滚动销毁', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/large-json`, '200');

    const bodyEl = page.locator('#response-body');
    await expect(bodyEl).toHaveClass(/vs-active/);

    // 切换到 Raw 格式
    await resp.switchFormat('raw');

    // 虚拟滚动器应被销毁
    await expect(bodyEl).not.toHaveClass(/vs-active/);
    await expect(page.locator('#response-format-content .vscroll-wrapper')).not.toBeVisible();

    // 切回 Pretty — 虚拟滚动器应重新激活
    await resp.switchFormat('pretty');
    await expect(bodyEl).toHaveClass(/vs-active/);
  });

  test('标签页切换时虚拟滚动销毁', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/large-json`, '200');

    const bodyEl = page.locator('#response-body');
    await expect(bodyEl).toHaveClass(/vs-active/);

    // 新建标签页
    await page.locator('.request-tab-add').click();

    // 切回第一个标签页
    await page.locator('.request-tab').first().click();

    // 虚拟滚动器应该重新初始化（因为响应数据仍在）
    // 切换标签后响应数据保留，虚拟滚动器应重新激活
    await expect(bodyEl).toHaveClass(/vs-active/);
  });
});
