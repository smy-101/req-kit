import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { HistoryPage } from './pages/history-page';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';
import { TabBar } from './pages/tab-bar';

test.describe('历史记录', () => {
  let history: HistoryPage;
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    history = new HistoryPage(page);
    rp = new RequestPage(page);
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
  });

  test('展开历史记录面板', async ({ page }) => {
    await history.expand();
    await expect(history.panel).toBeVisible();
  });

  test('历史记录中包含刚发送的请求', async ({ page }) => {
    await history.expand();

    await expect(history.items.first()).toBeVisible();
    await expect(history.items.first()).toContainText('localhost:4000');
  });

  test('按方法过滤历史记录', async ({ page }) => {
    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.filterByMethod('GET');

    await expect(history.items.first()).toBeVisible();
  });
});

test.describe('历史记录高级功能', () => {
  let history: HistoryPage;
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    history = new HistoryPage(page);
    rp = new RequestPage(page);
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
  });

  test('历史记录搜索', async ({ page }) => {
    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.search('localhost');
    await expect(history.items.first()).toBeVisible();
  });

  test('清空历史记录', async ({ page }) => {
    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.clearAllWithConfirm();
  });

  test('清空历史记录取消后保留数据', async ({ page }) => {
    await history.expand();
    await expect(history.items.first()).toBeVisible();

    // 点击清空按钮，弹出确认对话框
    await history.clearAll();

    // 点击取消
    await page.locator('#modal .modal-btn-secondary').click();

    // 验证历史记录仍然存在
    await expect(history.items.first()).toBeVisible();
  });

  test('点击历史记录项加载请求', async ({ page }) => {
    const tabBar = new TabBar(page);
    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await rp.setUrl('https://example.com');
    await expect(rp.urlInput).toHaveValue('https://example.com');
    await history.loadItem(0);

    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('历史记录搜索无结果', async ({ page }) => {
    const uniqueUrl = `${MOCK_BASE_URL}/get?search_empty_${Date.now()}`;
    await sendRequestAndWait(page, uniqueUrl, '200');

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.search('nonexistent-url-xyz_unique_prefix');
    await expect(history.emptyMsg).toBeVisible();
  });
});

test.describe('历史记录分页与过滤', () => {
  let history: HistoryPage;
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    history = new HistoryPage(page);
    rp = new RequestPage(page);
    await page.goto('/');
  });

  test('方法过滤 Chips — POST', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await rp.selectMethod('POST');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.filterByMethod('POST');

    const count = await history.items.count();
    for (let i = 0; i < count; i++) {
      await expect(history.items.nth(i)).toContainText('POST');
    }

    await history.filterByMethod('ALL');
  });

  test('方法过滤 Chips — 切换多种方法', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await rp.selectMethod('PUT');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/put`, '200');

    await rp.selectMethod('DELETE');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delete`, '200');

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.filterByMethod('PUT');
    const putCount = await history.items.count();
    for (let i = 0; i < putCount; i++) {
      await expect(history.items.nth(i)).toContainText('PUT');
    }

    await history.filterByMethod('DELETE');
    const delCount = await history.items.count();
    for (let i = 0; i < delCount; i++) {
      await expect(history.items.nth(i)).toContainText('DELETE');
    }

    await history.filterByMethod('ALL');
  });

  test('历史记录加载更多', async ({ page }) => {
    await rp.selectMethod('GET');
    for (let i = 0; i < 5; i++) {
      await sendRequestAndWait(page, `${MOCK_BASE_URL}/get?page=${i}`, '200', { timeout: 30_000 });
    }

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await expect(history.items.first()).toContainText('localhost:4000');
  });

  test('历史记录状态码显示', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await history.expand();
    await expect(history.getItemStatus(0)).toBeVisible();
    await expect(history.getItemStatus(0)).toHaveClass(/status-ok/);
  });

  test('历史记录显示响应时间和相对时间', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await expect(history.getItemTime(0)).toBeVisible();
    await expect(history.getItemAgo(0)).toBeVisible();
  });
});

test.describe('历史记录加载验证', () => {
  let history: HistoryPage;
  let rp: RequestPage;
  let tabBar: TabBar;

  test('点击历史记录加载 POST 请求并验证数据', async ({ page }) => {
    history = new HistoryPage(page);
    rp = new RequestPage(page);
    tabBar = new TabBar(page);
    await page.goto('/');

    const uniqueId = Date.now() % 100000000;
    const uniqueMarker = `history_verify_${uniqueId}`;
    const testBody = `{"test": "${uniqueMarker}"}`;
    const testUrl = `${MOCK_BASE_URL}/post/${uniqueId}`;
    await rp.selectMethod('POST');
    await rp.setUrl(testUrl);
    await rp.switchTab('body');
    await rp.fillBody(testBody);

    await rp.clickSend();
    await expect(page.locator('#response-status')).toContainText('200');

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    const targetItem = history.items.filter({ hasText: `post/${uniqueId}` }).first();
    await expect(targetItem).toBeVisible();

    const tabCountBefore = await tabBar.getTabCount();
    await targetItem.click();

    const tabCount = await tabBar.getTabCount();
    if (tabCount > tabCountBefore) {
      await tabBar.switchToTab(tabCount - 1);
    }

    await expect(rp.methodSelect).toHaveValue('POST');
    await expect(rp.urlInput).toHaveValue(new RegExp(`post/${uniqueId}`));

    await rp.switchTab('body');
    await expect(rp.bodyTextarea).toHaveValue(new RegExp(uniqueMarker));
  });

  test('点击历史记录恢复响应数据', async ({ page }) => {
    history = new HistoryPage(page);
    rp = new RequestPage(page);
    tabBar = new TabBar(page);
    const responsePage = new ResponsePage(page);
    await page.goto('/');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/uuid`, '200');

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    await history.loadItem(0);

    const tabCount = await tabBar.getTabCount();
    if (tabCount > 1) {
      await tabBar.switchToTab(tabCount - 1);
    }

    await expect(responsePage.statusEl).toContainText('200');
    await expect(responsePage.formatContent).not.toBeEmpty();
  });

  test('匹配的历史记录在当前标签页加载不创建新标签', async ({ page }) => {
    history = new HistoryPage(page);
    rp = new RequestPage(page);
    tabBar = new TabBar(page);
    await page.goto('/');

    const testUrl = `${MOCK_BASE_URL}/get?unique=${Date.now()}`;
    await sendRequestAndWait(page, testUrl, '200');

    await expect(page.locator('.request-tab')).toHaveCount(1);

    await history.expand();
    await expect(history.items.first()).toBeVisible();

    const targetItem = history.items.filter({ hasText: testUrl.substring(0, 40) }).first();
    await expect(targetItem).toBeVisible();

    await targetItem.click();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });
});
