import { test, expect } from '@playwright/test';

test.describe('请求头编辑器', () => {
  test('切换到 Headers 标签页显示键值编辑器', async ({ page }) => {
    await page.goto('/');
    // 默认已经是 Headers 标签
    const kvEditor = page.locator('#tab-headers .kv-editor');
    await expect(kvEditor).toBeVisible();
    await expect(kvEditor.locator('.kv-row').first()).toBeVisible();
  });

  test('添加请求头', async ({ page }) => {
    await page.goto('/');
    const addBtn = page.locator('#tab-headers .kv-add-btn');
    await addBtn.click();
    await addBtn.click(); // 再加一行，确保有足够行

    const rows = page.locator('#tab-headers .kv-row');
    const lastRow = rows.last();
    await lastRow.locator('.kv-key').fill('X-Custom-Header');
    await lastRow.locator('.kv-value').fill('test-value');
    await page.waitForTimeout(300); // debounce

    // 切换标签页再切回来，验证数据保留
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#request-panel .tab[data-tab="headers"]').click();
    await expect(rows.last().locator('.kv-key')).toHaveValue('X-Custom-Header');
    await expect(rows.last().locator('.kv-value')).toHaveValue('test-value');
  });

  test('删除请求头行', async ({ page }) => {
    await page.goto('/');
    const addBtn = page.locator('#tab-headers .kv-add-btn');
    await addBtn.click();
    await addBtn.click();

    let rows = page.locator('#tab-headers .kv-row');
    const count = await rows.count();

    // 删除最后一行
    await rows.last().locator('.kv-delete').click();
    rows = page.locator('#tab-headers .kv-row');
    await expect(rows).toHaveCount(count - 1);
  });

  test('禁用请求头（取消勾选）', async ({ page }) => {
    await page.goto('/');
    const firstRow = page.locator('#tab-headers .kv-row').first();
    const checkbox = firstRow.locator('.kv-enabled');
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe('查询参数编辑器', () => {
  test('切换到 Params 标签页显示键值编辑器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="params"]').click();
    const kvEditor = page.locator('#tab-params .kv-editor');
    await expect(kvEditor).toBeVisible();
    await expect(kvEditor.locator('.kv-row').first()).toBeVisible();
  });

  test('添加查询参数并验证请求中包含', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="params"]').click();

    const addBtn = page.locator('#tab-params .kv-add-btn');
    await addBtn.click();

    const rows = page.locator('#tab-params .kv-row');
    const lastRow = rows.last();
    await lastRow.locator('.kv-key').fill('foo');
    await lastRow.locator('.kv-value').fill('bar');
    await page.waitForTimeout(300);

    // 发送到 httpbin，验证参数出现在响应中
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('foo');
    await expect(responseBody).toContainText('bar');
  });
});
