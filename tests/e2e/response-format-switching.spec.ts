import { test, expect } from '@playwright/test';

test.describe('响应格式切换', () => {
  test('JSON 响应 Pretty/Raw/Preview 切换', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('https://httpbin.org/json');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

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

    // 切回 Pretty
    await page.locator('.format-tab[data-format="pretty"]').click();
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/);
  });

  test('HTML 响应自动进入 Preview 模式', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('https://httpbin.org/html');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // HTML 响应应自动选择 Preview
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5000 });

    // 验证 iframe 预览
    const iframe = page.locator('#response-format-content .html-preview-frame');
    await expect(iframe).toBeVisible({ timeout: 5000 });
  });

  test('HTML 响应切换到 Raw 显示原始 HTML', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('https://httpbin.org/html');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 等待 Preview 模式加载
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5000 });

    // 切换到 Raw
    await page.locator('.format-tab[data-format="raw"]').click();
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);

    // 验证内容包含 HTML 标签
    const formatContent = page.locator('#response-format-content');
    await expect(formatContent).toContainText('<html', { timeout: 5000 });
  });

  test('XML 响应 Pretty 格式化', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('https://httpbin.org/xml');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 默认 Pretty
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/, { timeout: 5000 });

    // 验证内容包含 XML 结构
    const formatContent = page.locator('#response-format-content');
    await expect(formatContent).toContainText('<?xml', { timeout: 5000 });
    await expect(formatContent).toContainText('<slideshow');

    // 切换到 Raw
    await page.locator('.format-tab[data-format="raw"]').click();
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    // Raw 也应包含 XML
    await expect(formatContent).toContainText('<?xml');
  });

  test('图片响应 Preview 显示图片', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('https://httpbin.org/image/png');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 图片响应应自动选择 Preview
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5000 });

    // 验证图片预览
    const previewImg = page.locator('#response-format-content .preview-img');
    await expect(previewImg).toBeVisible({ timeout: 5000 });
  });
});
