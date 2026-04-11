import { test, expect } from '@playwright/test';

test.describe('Body 编辑器', () => {
  test('切换 Body 类型显示对应编辑器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="body"]').click();

    const textarea = page.locator('#body-textarea');
    const typeSelect = page.locator('#body-type-select');

    // 默认 JSON — textarea 可见
    await expect(textarea).toBeVisible();

    // 切换到 None
    await typeSelect.selectOption('none');
    await expect(textarea).toBeHidden();

    // 切换到 Text
    await typeSelect.selectOption('text');
    await expect(textarea).toBeVisible();

    // 切换到 XML
    await typeSelect.selectOption('xml');
    await expect(textarea).toBeVisible();

    // 切换到 Form URL Encoded — textarea 仍然可见（KV editor 在 tab-params）
    await typeSelect.selectOption('form');
    await expect(textarea).toBeVisible();
  });

  test('切换到 Multipart 显示分段编辑器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-type-select').selectOption('multipart');

    const multipartEditor = page.locator('#multipart-editor');
    await expect(multipartEditor).toBeVisible();
    await expect(multipartEditor.locator('.multipart-row')).toHaveCount(1);
  });

  test('Multipart 添加和删除字段', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-type-select').selectOption('multipart');

    const addBtn = page.locator('.multipart-add-btn');
    await addBtn.click();
    await expect(page.locator('.multipart-row')).toHaveCount(2);

    // 填写字段
    const firstRow = page.locator('.multipart-row').first();
    await firstRow.locator('.multipart-key').fill('field1');
    await firstRow.locator('.multipart-text-value').fill('value1');

    // 删除最后一行
    await page.locator('.multipart-row').last().locator('.multipart-delete-btn').click();
    await expect(page.locator('.multipart-row')).toHaveCount(1);
  });

  test('切换到 Binary 显示文件选择器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-type-select').selectOption('binary');

    const binaryEditor = page.locator('#binary-editor');
    await expect(binaryEditor).toBeVisible();
    await expect(binaryEditor.locator('.binary-file-btn')).toBeVisible();
  });

  test('切换到 GraphQL 显示查询编辑器', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-type-select').selectOption('graphql');

    const graphqlEditor = page.locator('#graphql-editor');
    await expect(graphqlEditor).toBeVisible();
    await expect(page.locator('#graphql-query')).toBeVisible();
    await expect(page.locator('#graphql-variables')).toBeVisible();
    await expect(page.locator('#graphql-operation-name')).toBeVisible();

    // Format 按钮文字变为 "Format Variables"
    await expect(page.locator('#body-format-btn')).toHaveText('Format Variables');
  });

  test('GraphQL 填写查询并发送', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-type-select').selectOption('graphql');

    await page.locator('#graphql-query').fill('{ __typename }');
    await page.locator('#url-input').fill('https://httpbin.org/post');
    await page.waitForTimeout(300);

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证响应包含 GraphQL 查询内容
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('__typename');
  });

  test('Format JSON 按钮格式化 JSON 内容', async ({ page }) => {
    await page.goto('/');
    await page.locator('#request-panel .tab[data-tab="body"]').click();

    const textarea = page.locator('#body-textarea');
    await textarea.fill('{"a":1,"b":2}');
    await page.waitForTimeout(200);

    await page.locator('#body-format-btn').click();

    // 验证格式化后的内容包含缩进
    const value = await textarea.inputValue();
    expect(value).toContain('\n');
    expect(value).toContain('  ');
  });
});
