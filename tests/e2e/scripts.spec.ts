import { test, expect } from '@playwright/test';

test.describe('脚本与测试', () => {
  test('Pre-request Script 标签页显示编辑器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="script"]').click();

    await expect(page.locator('#script-textarea')).toBeVisible();
    // script-desc 存在于 DOM 中
    await expect(page.locator('#tab-script .script-desc')).toHaveCount(1);
  });

  test('编写 Pre-request Script 设置请求头', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="script"]').click();

    const textarea = page.locator('#script-textarea');
    await textarea.fill("request.setHeader('X-Custom', 'hello')");
    await page.waitForTimeout(300);

    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('X-Custom');
    await expect(responseBody).toContainText('hello');
  });

  test('Pre-request Script 修改请求头（含 Content-Type）', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#request-panel .tab[data-tab="script"]').click();

    const textarea = page.locator('#script-textarea');
    await textarea.fill("request.setHeader('X-Custom-Script', 'from-script')");
    await page.waitForTimeout(300);

    await page.locator('#url-input').fill('https://httpbin.org/post');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('X-Custom-Script');
    await expect(responseBody).toContainText('from-script');
  });

  test('Post-response Tests 标签页显示编辑器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="tests"]').click();

    await expect(page.locator('#post-script-textarea')).toBeVisible();
    // script-desc 存在于 DOM 中
    await expect(page.locator('#tab-tests .script-desc')).toHaveCount(1);
  });

  test('编写测试断言并查看结果', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="tests"]').click();

    const textarea = page.locator('#post-script-textarea');
    await textarea.fill('tests["Status is 200"] = response.status === 200');
    await page.waitForTimeout(300);

    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    // 切换到 Test Results 标签页
    await page.locator('#response-panel .tab[data-response-tab="test-results"]').click();
    const testResults = page.locator('#response-test-results');
    await expect(testResults).toBeVisible();

    // 验证测试通过 — 使用 .test-passed 类名
    await expect(testResults).toContainText('Status is 200');
    await expect(testResults.locator('.test-passed')).toBeVisible({ timeout: 5000 });
    await expect(testResults).toContainText('1 passed');
  });

  test('测试断言失败显示失败状态', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="tests"]').click();

    const textarea = page.locator('#post-script-textarea');
    await textarea.fill('tests["Should be 404"] = response.status === 404');
    await page.waitForTimeout(300);

    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    // 切换到 Test Results 标签页
    await page.locator('#response-panel .tab[data-response-tab="test-results"]').click();
    const testResults = page.locator('#response-test-results');

    await expect(testResults).toContainText('Should be 404');
    await expect(testResults.locator('.test-failed')).toBeVisible({ timeout: 5000 });
    await expect(testResults).toContainText('1 failed');
  });

  test('Tests 中设置变量并在后续请求中使用', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="tests"]').click();

    const textarea = page.locator('#post-script-textarea');
    await textarea.fill('variables.set("saved_url", "https://httpbin.org/uuid")');
    await page.waitForTimeout(300);

    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    // 创建新标签页
    await page.locator('.request-tab-add').click();

    // 在 URL 中使用变量
    await page.locator('#url-input').fill('{{saved_url}}');
    await page.waitForTimeout(300);

    await page.locator('#send-btn').click();
    // 应该成功发送到 httpbin.org/uuid
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });
  });

  test('Pre-request Script 在不同标签页间独立', async ({ page }) => {
    await page.goto('/');

    // 在第一个标签页设置脚本
    await page.locator('#request-panel .tab[data-tab="script"]').click();
    await page.locator('#script-textarea').fill('console.log("tab1")');
    await page.waitForTimeout(300);

    // 创建新标签页
    await page.locator('.request-tab-add').click();

    // 验证新标签页的脚本是空的
    await expect(page.locator('#script-textarea')).toHaveValue('');
  });
});
