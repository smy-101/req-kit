import { test, expect } from '@playwright/test';

test.describe('边界情况', () => {
  test('空 URL 不发送请求', async ({ page }) => {
    await page.goto('/');

    // 确保 URL 输入框为空
    await page.locator('#url-input').clear();
    await page.locator('#send-btn').click();

    // 等待一小段时间确认没有请求发出
    await page.waitForTimeout(1000);

    // 响应状态应保持为空（不会发送请求）
    await expect(page.locator('#response-status')).toHaveText('', { timeout: 3000 });
  });

  test('无效 URL 发送请求显示错误', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill('not-a-valid-url');
    await page.locator('#send-btn').click();

    // 应显示 5xx 错误样式（后端返回错误响应，renderResponse 处理）
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/, { timeout: 15000 });
    // 响应体应显示错误信息（在 format-content 中）
    await expect(page.locator('#response-format-content')).toBeVisible({ timeout: 5000 });
  });

  test('不可达主机发送请求显示错误', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill('http://this-host-does-not-exist-12345.invalid/get');
    await page.locator('#send-btn').click();

    // 应显示 5xx 错误样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/, { timeout: 15000 });
    // 响应体应显示错误内容
    await expect(page.locator('#response-format-content')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('主题持久化', () => {
  test('切换暗色主题后刷新页面保持主题', async ({ page }) => {
    await page.goto('/');

    // 切换到亮色主题（默认可能是暗色）
    await page.locator('#btn-theme-toggle').click();
    await page.waitForTimeout(300);

    // 验证主题属性已更改
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBeTruthy();

    // 刷新页面
    await page.reload();
    await page.waitForTimeout(500);

    // 验证主题保持
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAfter).toBe(theme);
  });

  test('切换主题两次后恢复原始主题', async ({ page }) => {
    await page.goto('/');

    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');

    // 切换两次
    await page.locator('#btn-theme-toggle').click();
    await page.waitForTimeout(300);
    await page.locator('#btn-theme-toggle').click();
    await page.waitForTimeout(300);

    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAfter).toBe(themeBefore);
  });
});

test.describe('侧边栏历史记录区域', () => {
  test('折叠和展开历史记录区域', async ({ page }) => {
    await page.goto('/');

    const historyHeader = page.locator('.history-header');
    await expect(historyHeader).toBeVisible();

    // 点击展开
    await historyHeader.click();
    await expect(page.locator('.history-panel.expanded')).toBeVisible({ timeout: 5000 });

    // 再次点击折叠
    await historyHeader.click();
    await expect(page.locator('.history-panel.expanded')).not.toBeVisible();
  });
});
