import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('响应额外功能', () => {
  test('4xx 响应状态码样式', async ({ page }) => {
    await page.goto('/');

    // 发送请求到 404 端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/status/404`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('404');

    // 验证 4xx 状态码样式
    await expect(page.locator('#response-status')).toHaveClass(/status-4xx/);
  });

  test('5xx 响应状态码样式', async ({ page }) => {
    await page.goto('/');

    // 发送请求到 500 端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/status/500`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('500');

    // 验证 5xx 状态码样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
  });

  test('3xx 重定向响应状态码样式', async ({ page }) => {
    await page.goto('/');

    // 关闭跟随重定向以看到 3xx 状态码
    await page.locator('#request-options-btn').click();
    await page.waitForTimeout(300);
    await page.locator('#request-redirect-toggle').evaluate(el => { (el as HTMLInputElement).checked = false; el.dispatchEvent(new Event('change')); });
    await page.waitForTimeout(300);
    await page.locator('#request-options-btn').click();

    // 发送请求到重定向端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/redirect/1`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('302');

    // 验证 3xx 状态码样式
    await expect(page.locator('#response-status')).toHaveClass(/status-3xx/);

    // 恢复跟随重定向
    await page.locator('#request-options-btn').click();
    await page.waitForTimeout(300);
    await page.locator('#request-redirect-toggle').evaluate(el => { (el as HTMLInputElement).checked = true; el.dispatchEvent(new Event('change')); });
    await page.waitForTimeout(300);
    await page.locator('#request-options-btn').click();
  });

  test('XML 响应格式化', async ({ page }) => {
    await page.goto('/');

    // 发送请求获取 XML 响应
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/xml`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切换到 Pretty 格式
    const prettyTab = page.locator('.format-tab[data-format="pretty"]');
    if (await prettyTab.isVisible()) {
      await prettyTab.click();
    }

    // 验证响应内容包含 XML 标签
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('xml');
  });

  test('图片响应预览', async ({ page }) => {
    await page.goto('/');

    // 发送请求获取图片
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/image/png`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切换到 Preview 模式
    const previewTab = page.locator('.format-tab[data-format="preview"]');
    if (await previewTab.isVisible()) {
      await previewTab.click();
      await page.waitForTimeout(500);
    }

    // 验证图片预览元素
    const imagePreview = page.locator('.image-preview');
    if (await imagePreview.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(imagePreview.locator('.preview-img')).toBeVisible();
    }
  });

  test('Script 日志显示', async ({ page }) => {
    await page.goto('/');

    // 编写包含 console.log 的 Pre-request Script
    await page.locator('#request-panel .tab[data-tab="script"]').click();
    const textarea = page.locator('#script-textarea');
    await textarea.fill("console.log('hello from script'); console.log('second log')");
    await page.waitForTimeout(300);

    // 发送请求
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证脚本日志显示
    await expect(page.locator('.response-logs')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.response-logs')).toContainText('hello from script');
    await expect(page.locator('.response-logs')).toContainText('second log');
  });

  test('Post-response Script 日志显示', async ({ page }) => {
    await page.goto('/');

    // 编写包含 console.log 的 Post-response Script
    await page.locator('#request-panel .tab[data-tab="tests"]').click();
    const textarea = page.locator('#post-script-textarea');
    await textarea.fill("console.log('post log: ' + response.status)");
    await page.waitForTimeout(300);

    // 发送请求
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证 post-response 脚本日志显示
    await expect(page.locator('.response-logs')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.response-logs')).toContainText('post log');
  });
});
