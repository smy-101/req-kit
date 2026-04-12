import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('历史记录', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 先发送一个请求，确保有历史记录
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
  });

  test('展开历史记录面板', async ({ page }) => {
    // 点击历史记录头部展开
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-panel')).toBeVisible();
  });

  test('历史记录中包含刚发送的请求', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();

    // 等待历史记录列表加载
    const historyItems = page.locator('.history-item');
    await expect(historyItems.first()).toBeVisible({ timeout: 5000 });

    // 验证包含发送的 URL
    await expect(page.locator('.history-item').first()).toContainText('localhost:4000');
  });

  test('按方法过滤历史记录', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 点击 GET 过滤
    const getChip = page.locator('.history-chip').filter({ hasText: 'GET' });
    await getChip.click();

    // 验证历史记录仍然存在（因为发送的是 GET 请求）
    await expect(page.locator('.history-item').first()).toBeVisible();
  });
});
