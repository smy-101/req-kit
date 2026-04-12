import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab } from './helpers/wait';

test.describe('历史记录', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
  });

  test('展开历史记录面板', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-panel')).toBeVisible();
  });

  test('历史记录中包含刚发送的请求', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();

    const historyItems = page.locator('.history-item');
    await expect(historyItems.first()).toBeVisible();

    await expect(page.locator('.history-item').first()).toContainText('localhost:4000');
  });

  test('按方法过滤历史记录', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    const getChip = page.locator('.history-chip').filter({ hasText: 'GET' });
    await getChip.click();

    await expect(page.locator('.history-item').first()).toBeVisible();
  });
});

test.describe('历史记录高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
  });

  test('历史记录搜索', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    const searchInput = page.locator('.history-search-input');
    await searchInput.fill('localhost');
    await expect(page.locator('.history-item').first()).toBeVisible();
  });

  test('清空历史记录', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    const clearBtn = page.locator('.history-clear-btn');
    await clearBtn.click();

    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible();
    await page.locator('#modal .modal-btn-danger').click();

    await expect(page.locator('.history-empty')).toBeVisible();
  });

  test('点击历史记录项加载请求', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    await page.locator('#url-input').fill('https://example.com');
    // 确认 URL 已更新到 input（store debounce 可能延迟）
    await expect(page.locator('#url-input')).toHaveValue('https://example.com');
    await page.locator('.history-item').first().click();

    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('历史记录搜索无结果', async ({ page }) => {
    const uniqueUrl = `${MOCK_BASE_URL}/get?search_empty_${Date.now()}`;
    await sendRequestAndWait(page, uniqueUrl, '200');

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('.history-search-input');
    await searchInput.fill('nonexistent-url-xyz_unique_prefix');
    await expect(page.locator('.history-empty')).toBeVisible();
  });
});

test.describe('历史记录分页与过滤', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('方法过滤 Chips — POST', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await page.locator('#method-select').selectOption('POST');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    const postChip = page.locator('.history-chip').filter({ hasText: 'POST' });
    await postChip.click();

    const historyItems = page.locator('.history-item');
    const count = await historyItems.count();
    for (let i = 0; i < count; i++) {
      await expect(historyItems.nth(i)).toContainText('POST');
    }

    const allChip = page.locator('.history-chip').filter({ hasText: 'ALL' });
    await allChip.click();
  });

  test('方法过滤 Chips — 切换多种方法', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await page.locator('#method-select').selectOption('PUT');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/put`, '200');

    await page.locator('#method-select').selectOption('DELETE');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delete`, '200');

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    await page.locator('.history-chip').filter({ hasText: 'PUT' }).click();
    const putItems = page.locator('.history-item');
    const putCount = await putItems.count();
    for (let i = 0; i < putCount; i++) {
      await expect(putItems.nth(i)).toContainText('PUT');
    }

    await page.locator('.history-chip').filter({ hasText: 'DELETE' }).click();
    const delItems = page.locator('.history-item');
    const delCount = await delItems.count();
    for (let i = 0; i < delCount; i++) {
      await expect(delItems.nth(i)).toContainText('DELETE');
    }

    await page.locator('.history-chip').filter({ hasText: 'ALL' }).click();
  });

  test('历史记录加载更多', async ({ page }) => {
    await page.locator('#method-select').selectOption('GET');
    for (let i = 0; i < 5; i++) {
      await sendRequestAndWait(page, `${MOCK_BASE_URL}/get?page=${i}`, '200', { timeout: 30_000 });
    }

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    await expect(page.locator('.history-item').first()).toContainText('localhost:4000');
  });

  test('历史记录状态码显示', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first().locator('.history-status')).toBeVisible();

    await expect(page.locator('.history-item').first().locator('.history-status')).toHaveClass(/status-ok/);
  });

  test('历史记录显示响应时间和相对时间', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible();

    await expect(page.locator('.history-item').first().locator('.history-time')).toBeVisible();
    await expect(page.locator('.history-item').first().locator('.history-ago')).toBeVisible();
  });
});

test.describe('历史记录加载验证', () => {
  test('点击历史记录加载 POST 请求并验证数据', async ({ page }) => {
    await page.goto('/');

    const uniqueId = Date.now() % 100000000;
    const uniqueMarker = `history_verify_${uniqueId}`;
    const testBody = `{"test": "${uniqueMarker}"}`;
    const testUrl = `${MOCK_BASE_URL}/post/${uniqueId}`;
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(testUrl);
    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill(testBody);

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('.history-header').click();
    await expect(page.locator('.history-panel')).toBeVisible();
    await expect(page.locator('.history-item').first()).toBeVisible();

    const targetItem = page.locator('.history-item').filter({ hasText: `post/${uniqueId}` }).first();
    await expect(targetItem).toBeVisible();

    const tabCountBefore = await page.locator('.request-tab').count();
    await targetItem.click();

    const tabs = page.locator('.request-tab');
    const tabCount = await tabs.count();
    if (tabCount > tabCountBefore) {
      await tabs.last().click();
    }

    await expect(page.locator('#method-select')).toHaveValue('POST', { timeout: 10000 });
    await expect(page.locator('#url-input')).toHaveValue(new RegExp(`post/${uniqueId}`), { timeout: 10000 });

    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await expect(page.locator('#body-textarea')).toHaveValue(new RegExp(uniqueMarker));
  });

  test('点击历史记录恢复响应数据', async ({ page }) => {
    await page.goto('/');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/uuid`, '200');

    await page.locator('.history-header').click();
    await expect(page.locator('.history-panel')).toBeVisible();
    await expect(page.locator('.history-item').first()).toBeVisible();

    await page.locator('.history-item').first().click();

    const tabs = page.locator('.request-tab');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      await tabs.last().click();
    }

    await expect(page.locator('#response-status')).toContainText('200');
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).not.toBeEmpty();
  });

  test('匹配的历史记录在当前标签页加载不创建新标签', async ({ page }) => {
    await page.goto('/');

    const testUrl = `${MOCK_BASE_URL}/get?unique=${Date.now()}`;
    await sendRequestAndWait(page, testUrl, '200');

    await expect(page.locator('.request-tab')).toHaveCount(1);

    await page.locator('.history-header').click();
    await expect(page.locator('.history-panel')).toBeVisible();
    await expect(page.locator('.history-item').first()).toBeVisible();

    const targetItem = page.locator('.history-item').filter({ hasText: testUrl.substring(0, 40) }).first();
    await expect(targetItem).toBeVisible();

    await targetItem.click();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });
});
