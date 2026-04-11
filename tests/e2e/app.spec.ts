import { test, expect } from '@playwright/test';

test.describe('应用基本功能', () => {
  test('首页能正常加载', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('req-kit');
  });

  test('侧边栏关键元素存在', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-header h2')).toHaveText('req-kit');
    await expect(page.locator('#url-bar')).toBeVisible();
    await expect(page.locator('#method-select')).toBeVisible();
    await expect(page.locator('#url-input')).toBeVisible();
    await expect(page.locator('#send-btn')).toBeVisible();
  });

  test('请求方法选择器包含所有 HTTP 方法', async ({ page }) => {
    await page.goto('/');
    const methodSelect = page.locator('#method-select');
    const options = methodSelect.locator('option');
    await expect(options).toHaveCount(7);
    const texts = await options.allTextContents();
    expect(texts).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
  });

  test('切换深色/浅色主题', async ({ page }) => {
    await page.goto('/');
    const themeBtn = page.locator('#btn-theme-toggle');
    await expect(themeBtn).toBeVisible();

    // 第一次点击：从默认 dark 切换到 light
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 第二次点击：从 light 切换回 dark
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('请求面板包含所有标签页', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('#request-panel .tab');
    await expect(tabs).toHaveCount(6);
    const texts = await tabs.allTextContents();
    expect(texts.map(t => t.trim())).toEqual([
      'Headers', 'Params', 'Body', 'Auth', 'Pre-request Script', 'Tests',
    ]);
  });

  test('响应面板存在', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#response-panel')).toBeVisible();
  });
});
