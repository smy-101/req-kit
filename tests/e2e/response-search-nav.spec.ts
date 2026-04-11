import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('响应搜索导航', () => {
  test('搜索匹配计数显示正确', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 确保在 body 标签
    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();

    const searchBar = page.locator('#response-search-bar');
    await expect(searchBar).toBeVisible();

    // 搜索 "url" — httpbin 的 /get 响应中包含多个 "url"
    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    expect(countText).not.toBe('');
    // 格式应为 "N/M"，N 和 M 都是数字
    expect(countText).toMatch(/\d+\/\d+/);
  });

  test('点击下一匹配按钮导航', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    // 获取初始计数
    const searchCount = page.locator('#response-search-count');
    const initialCount = await searchCount.textContent();

    // 点击下一匹配
    await page.locator('#search-next-btn').click();
    await page.waitForTimeout(200);

    const afterCount = await searchCount.textContent();
    // 计数应该变化（递增，除非只有一个匹配）
    if (initialCount !== '1/1') {
      expect(afterCount).not.toBe(initialCount);
    }
  });

  test('点击上一匹配按钮导航', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    // 先前进到第二个匹配
    await page.locator('#search-next-btn').click();
    await page.waitForTimeout(200);

    const countAfterNext = await page.locator('#response-search-count').textContent();

    // 再后退
    await page.locator('#search-prev-btn').click();
    await page.waitForTimeout(200);

    const countAfterPrev = await page.locator('#response-search-count').textContent();
    // 应该回到之前的计数
    if (countAfterNext !== '1/1') {
      expect(countAfterPrev).not.toBe(countAfterNext);
    }
  });

  test('下一匹配按钮循环回第一个', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    // 解析总匹配数
    const totalMatch = countText?.split('/')[1];
    if (totalMatch && parseInt(totalMatch) > 1) {
      // 连续点击 next 直到到达最后一个
      for (let i = 0; i < parseInt(totalMatch); i++) {
        await page.locator('#search-next-btn').click();
        await page.waitForTimeout(100);
      }
      // 应该循环回到 1/N
      const finalCount = await searchCount.textContent();
      expect(finalCount).toBe(`1/${totalMatch}`);
    }
  });

  test('上一匹配按钮循环到最后一个', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    const totalMatch = countText?.split('/')[1];

    if (totalMatch && parseInt(totalMatch) > 1) {
      // 在第一个匹配时按 prev
      await page.locator('#search-prev-btn').click();
      await page.waitForTimeout(200);

      const finalCount = await searchCount.textContent();
      expect(finalCount).toBe(`${totalMatch}/${totalMatch}`);
    }
  });

  test('清空搜索词清除高亮', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    // 验证有高亮
    const highlights = page.locator('#response-format-content .search-highlight');
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);

    // 清空搜索
    await page.locator('#response-search-input').fill('');
    await page.waitForTimeout(300);

    // 高亮应清除
    const searchCount = page.locator('#response-search-count');
    await expect(searchCount).toHaveText('');
  });

  test('按 Escape 关闭搜索栏', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#response-panel .tab[data-response-tab="body"]').click();
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('test');
    await page.waitForTimeout(200);

    await page.locator('#response-search-input').press('Escape');

    await expect(page.locator('#response-search-bar')).toBeHidden();
  });

  test('在 Raw 格式下搜索正常工作', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切换到 Raw 格式
    await page.locator('.format-tab[data-format="raw"]').click();
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);

    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    expect(countText).not.toBe('');
    expect(countText).toMatch(/\d+\/\d+/);
  });
});
