import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchResponseTab } from './helpers/wait';


test.describe('响应搜索导航', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('搜索匹配计数显示正确', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 确保在 body 标签
    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();

    const searchBar = page.locator('#response-search-bar');
    await expect(searchBar).toBeVisible();

    // 搜索 "localhost" — mock /get 响应中 Host 和 url 各出现一次
    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索 debounce 完成
    await expect(page.locator('#response-search-count')).not.toHaveText('', { timeout: 5000 });
  });

  test('点击下一匹配按钮导航', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索结果出现
    await expect(page.locator('#response-search-count')).not.toHaveText('', { timeout: 5000 });

    // 获取初始计数
    const searchCount = page.locator('#response-search-count');
    const initialCount = await searchCount.textContent();

    // 点击下一匹配
    await page.locator('#search-next-btn').click();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const afterCount = await searchCount.textContent();
    // 计数应该变化（搜索结果包含多个匹配）
    expect(initialCount).not.toBe('1/1');
    expect(afterCount).not.toBe(initialCount);
  });

  test('点击上一匹配按钮导航', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索结果出现
    await expect(page.locator('#response-search-count')).not.toHaveText('', { timeout: 5000 });

    // 先前进到第二个匹配
    await page.locator('#search-next-btn').click();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const countAfterNext = await page.locator('#response-search-count').textContent();

    // 再后退
    await page.locator('#search-prev-btn').click();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const countAfterPrev = await page.locator('#response-search-count').textContent();
    // 应该回到之前的计数
    expect(countAfterNext).not.toBe('1/1');
    expect(countAfterPrev).not.toBe(countAfterNext);
  });

  test('下一匹配按钮循环回第一个', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索结果出现
    await expect(page.locator('#response-search-count')).not.toHaveText('', { timeout: 5000 });

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    // 解析总匹配数
    const totalMatch = countText?.split('/')[1];
    expect(totalMatch).toBeDefined();
    expect(parseInt(totalMatch!)).toBeGreaterThan(1);

    // 连续点击 next 直到到达最后一个
    const total = parseInt(totalMatch!);
    for (let i = 0; i < total; i++) {
      await page.locator('#search-next-btn').click();
      await page.waitForFunction(
        ([selector]) => document.querySelector(selector)?.textContent !== '',
        ['#response-search-count'],
      );
    }
    // 应该循环回到 1/N
    const finalCount = await searchCount.textContent();
    expect(finalCount).toBe(`1/${totalMatch}`);
  });

  test('上一匹配按钮循环到最后一个', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索结果出现
    await expect(page.locator('#response-search-count')).not.toHaveText('', { timeout: 5000 });

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    const totalMatch = countText?.split('/')[1];
    expect(totalMatch).toBeDefined();
    expect(parseInt(totalMatch!)).toBeGreaterThan(1);

    // 在第一个匹配时按 prev
    await page.locator('#search-prev-btn').click();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const finalCount = await searchCount.textContent();
    expect(finalCount).toBe(`${totalMatch}/${totalMatch}`);
  });

  test('清空搜索词清除高亮', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索高亮出现
    await expect(page.locator('#response-format-content .search-highlight').first()).toBeVisible({ timeout: 5000 });

    // 验证有高亮
    const highlights = page.locator('#response-format-content .search-highlight');
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);

    // 清空搜索
    await page.locator('#response-search-input').fill('');
    // 等待高亮清除
    await expect(page.locator('#response-format-content .search-highlight')).toHaveCount(0, { timeout: 5000 });
  });

  test('按 Escape 关闭搜索栏', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('test');

    await page.locator('#response-search-input').press('Escape');

    await expect(page.locator('#response-search-bar')).toBeHidden();
  });

  test('在 Raw 格式下搜索正常工作', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 切换到 Raw 格式
    await page.locator('.format-tab[data-format="raw"]').click();
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);

    await page.locator('#search-toggle-btn').click();
    await expect(page.locator('#response-search-bar')).toBeVisible();

    await page.locator('#response-search-input').fill('localhost');
    // 等待搜索结果出现
    await expect(page.locator('#response-search-count')).not.toHaveText('', { timeout: 5000 });

    const searchCount = page.locator('#response-search-count');
    const countText = await searchCount.textContent();
    expect(countText).not.toBe('');
    expect(countText).toMatch(/\d+\/\d+/);
  });
});
