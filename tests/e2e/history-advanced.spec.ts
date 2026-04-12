import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('历史记录高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 发送一个请求确保有历史记录
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
  });

  test('历史记录搜索', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 搜索
    const searchInput = page.locator('.history-search-input');
    await searchInput.fill('localhost');
    // 等待搜索 debounce 完成
    await expect(page.locator('.history-item').first()).toBeVisible();
  });

  test('清空历史记录', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 点击清空按钮
    const clearBtn = page.locator('.history-clear-btn');
    await clearBtn.click();

    // 确认删除
    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal .modal-btn-danger').click();

    // 验证历史记录已清空
    await expect(page.locator('.history-empty')).toBeVisible({ timeout: 5000 });
  });

  test('点击历史记录项加载请求', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 修改当前标签页的 URL，使其不匹配历史记录
    await page.locator('#url-input').fill('https://example.com');

    // 点击历史记录项会创建新标签页（因为 URL 不匹配）
    await page.locator('.history-item').first().click();

    // 验证新标签页被创建
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('历史记录搜索无结果', async ({ page }) => {
    // 发送一个唯一请求确保有历史记录（避免被并行测试清空影响）
    const uniqueUrl = `${MOCK_BASE_URL}/get?search_empty_${Date.now()}`;
    await sendRequestAndWait(page, uniqueUrl, '200');

    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 10000 });

    // 搜索不存在的 URL
    const searchInput = page.locator('.history-search-input');
    await searchInput.fill('nonexistent-url-xyz_unique_prefix');
    // 等待搜索 debounce 完成
    await expect(page.locator('.history-empty')).toBeVisible({ timeout: 5000 });
  });
});
