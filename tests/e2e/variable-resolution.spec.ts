import { test, expect } from '@playwright/test';

test.describe('变量在 Headers 和 Body 中的替换', () => {
  test('环境变量在 Headers 中替换', async ({ page }) => {
    await page.goto('/');

    // 创建环境并添加变量
    const envName = `HeaderVar_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });
    await kvEditor.locator('.kv-add-btn').click();

    const firstRow = kvEditor.locator('.kv-row').first();
    await firstRow.locator('.kv-key').fill('custom_header');
    await firstRow.locator('.kv-value').fill('hello-from-env');

    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());
    await page.locator('#modal #close-env-modal').click();

    // 选择该环境
    await page.locator('#active-env').selectOption({ label: envName });

    // 在 Headers 标签页使用变量
    await page.locator('#request-panel .tab[data-tab="headers"]').click();
    const headersContainer = page.locator('#tab-headers');
    await headersContainer.locator('.kv-add-btn').click();
    const headerRow = headersContainer.locator('.kv-row').first();
    await headerRow.locator('.kv-key').fill('X-Custom-Header');
    await headerRow.locator('.kv-value').fill('{{custom_header}}');
    await page.waitForTimeout(300);

    // 发送 POST 请求到 httpbin /post 验证 header
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill('https://httpbin.org/post');
    await page.locator('#send-btn').click();

    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('hello-from-env', { timeout: 5000 });
  });

  test('环境变量在 Body 中替换', async ({ page }) => {
    await page.goto('/');

    // 创建环境并添加变量
    const envName = `BodyVar_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });
    await kvEditor.locator('.kv-add-btn').click();

    const firstRow = kvEditor.locator('.kv-row').first();
    await firstRow.locator('.kv-key').fill('msg');
    await firstRow.locator('.kv-value').fill('hello-body-var');

    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());
    await page.locator('#modal #close-env-modal').click();

    // 选择该环境
    await page.locator('#active-env').selectOption({ label: envName });

    // 在 Body 中使用变量
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    const textarea = page.locator('#body-textarea');
    await textarea.fill('{"message": "{{msg}}"}');
    await page.waitForTimeout(300);

    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill('https://httpbin.org/post');
    await page.locator('#send-btn').click();

    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('hello-body-var');
  });
});
