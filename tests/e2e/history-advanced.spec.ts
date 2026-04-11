import { test, expect } from '@playwright/test';

test.describe('历史记录高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 发送一个请求确保有历史记录
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');
  });

  test('历史记录搜索', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 搜索
    const searchInput = page.locator('.history-search-input');
    await searchInput.fill('httpbin');
    await page.waitForTimeout(500); // debounce

    // 应该有匹配结果
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
    await page.waitForTimeout(200);

    // 点击历史记录项会创建新标签页（因为 URL 不匹配）
    await page.locator('.history-item').first().click();
    await page.waitForTimeout(500);

    // 验证新标签页被创建
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('历史记录搜索无结果', async ({ page }) => {
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 搜索不存在的 URL
    const searchInput = page.locator('.history-search-input');
    await searchInput.fill('nonexistent-url-xyz');
    await page.waitForTimeout(500); // debounce

    // 应该没有结果
    await expect(page.locator('.history-empty')).toBeVisible();
  });
});
