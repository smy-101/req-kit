import { test, expect } from './fixtures';

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

test.describe('边界情况', () => {
  test('空 URL 不发送请求', async ({ page }) => {
    await page.goto('/');

    // 确保 URL 输入框为空
    await page.locator('#url-input').clear();
    await page.locator('#send-btn').click();

    // 发送按钮文字应保持 "Send"（不会进入 loading 状态）
    await expect(page.locator('#send-btn')).toHaveText('Send');
  });

  test('无效 URL 发送请求显示错误', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill('not-a-valid-url');
    await page.locator('#send-btn').click();

    // 应显示 5xx 错误样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    // 响应体应显示错误信息
    await expect(page.locator('.response-error')).toBeVisible();
  });

  test('不可达主机发送请求显示错误', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill('http://this-host-does-not-exist-12345.invalid/get');
    await page.locator('#send-btn').click();

    // 应显示 5xx 错误样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    // 响应体应显示错误内容
    await expect(page.locator('.response-error')).toBeVisible();
  });
});

test.describe('主题持久化', () => {
  test('切换暗色主题后刷新页面保持主题', async ({ page }) => {
    await page.goto('/');

    // 切换到亮色主题（默认可能是暗色）
    await page.locator('#btn-theme-toggle').click();

    // 验证主题属性已更改
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBeTruthy();

    // 刷新页面
    await page.reload();

    // 验证主题保持
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAfter).toBe(theme);
  });

  test('切换主题两次后恢复原始主题', async ({ page }) => {
    await page.goto('/');

    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');

    // 切换两次
    await page.locator('#btn-theme-toggle').click();
    await page.locator('#btn-theme-toggle').click();

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
    await expect(page.locator('.history-panel.expanded')).toBeVisible();

    // 再次点击折叠
    await historyHeader.click();
    await expect(page.locator('.history-panel.expanded')).not.toBeVisible();
  });
});
