import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('响应面板高级功能', () => {
  test('响应格式切换 Pretty/Raw/Preview', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/json`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 等待 format bar 出现
    const formatBar = page.locator('#response-format-bar');
    await expect(formatBar).toBeVisible();

    // 默认 Pretty
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/);

    // 切换到 Raw
    await page.locator('.format-tab[data-format="raw"]').click();
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    await expect(page.locator('.format-tab[data-format="pretty"]')).not.toHaveClass(/active/);

    // 切换到 Preview
    await page.locator('.format-tab[data-format="preview"]').click();
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/);
  });

  test('响应搜索功能', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 点击搜索按钮
    await page.locator('#search-toggle-btn').click();

    const searchBar = page.locator('#response-search-bar');
    await expect(searchBar).toBeVisible();

    // 输入搜索词
    await page.locator('#response-search-input').fill('url');
    await page.waitForTimeout(300);

    // 验证搜索计数
    const searchCount = page.locator('#response-search-count');
    await expect(searchCount).not.toHaveText('');

    // 关闭搜索
    await page.locator('#search-close-btn').click();
    await expect(searchBar).toBeHidden();
  });

  test('Ctrl+F 打开响应搜索', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 确保响应面板 body 标签活跃
    await page.locator('#response-panel .tab[data-response-tab="body"]').click();

    // Ctrl+F
    await page.locator('#response-panel').press('Control+f');

    const searchBar = page.locator('#response-search-bar');
    await expect(searchBar).toBeVisible();
  });

  test('响应 Cookies 标签页', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/cookies/set?test=123`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切换到 Cookies 标签
    await page.locator('#response-panel .tab[data-response-tab="cookies"]').click();
    const cookiesContent = page.locator('#response-cookies');
    await expect(cookiesContent).toBeVisible();
  });

  test('响应 Test Results 标签页（无测试时）', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切换到 Test Results 标签
    await page.locator('#response-panel .tab[data-response-tab="test-results"]').click();
    const testResults = page.locator('#response-test-results');
    await expect(testResults).toBeVisible();
  });

  test('HTML 响应 Preview 模式', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/html`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切换到 Preview
    await page.locator('.format-tab[data-format="preview"]').click();

    // 应该有 iframe 预览
    const iframe = page.locator('#response-format-content .html-preview-frame');
    await expect(iframe).toBeVisible({ timeout: 5000 });
  });

  test('发送 PUT 请求', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/put`);

    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-textarea').fill('{"method": "PUT"}');
    await page.waitForTimeout(300);

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('PUT');
  });

  test('发送 DELETE 请求', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('DELETE');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delete`);

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');
  });
});
