import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab } from './helpers/wait';


test.describe('Body 编辑器', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('切换 Body 类型显示对应编辑器', async ({ page }) => {
    await switchRequestTab(page, 'body');

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
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('multipart');

    const multipartEditor = page.locator('#multipart-editor');
    await expect(multipartEditor).toBeVisible();
    await expect(multipartEditor.locator('.multipart-row')).toHaveCount(1);
  });

  test('Multipart 添加和删除字段', async ({ page }) => {
    await switchRequestTab(page, 'body');
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
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('binary');

    const binaryEditor = page.locator('#binary-editor');
    await expect(binaryEditor).toBeVisible();
    await expect(binaryEditor.locator('.binary-file-btn')).toBeVisible();
  });

  test('切换到 GraphQL 显示查询编辑器', async ({ page }) => {
    await switchRequestTab(page, 'body');
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
    await page.locator('#method-select').selectOption('POST');
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('graphql');

    await page.locator('#graphql-query').fill('{ __typename }');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 GraphQL 查询内容
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('__typename');
  });

  test('Format JSON 按钮格式化 JSON 内容', async ({ page }) => {
    await switchRequestTab(page, 'body');

    const textarea = page.locator('#body-textarea');
    await textarea.fill('{"a":1,"b":2}');

    await page.locator('#body-format-btn').click();

    // 验证格式化后的内容包含缩进
    const value = await textarea.inputValue();
    expect(value).toContain('\n');
    expect(value).toContain('  ');
  });
});

test.describe('Body 类型发送验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Form URL Encoded body 发送', async ({ page }) => {
    await page.locator('#method-select').selectOption('POST');
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('form');

    // Form 类型使用 textarea 输入 URL 编码格式的数据
    const textarea = page.locator('#body-textarea');
    await textarea.fill('username=testuser');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 form 数据
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('username');
    await expect(responseBody).toContainText('testuser');
  });

  test('Multipart body 发送', async ({ page }) => {
    await page.locator('#method-select').selectOption('POST');
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('multipart');

    // 填写 multipart 字段
    const firstRow = page.locator('.multipart-row').first();
    await firstRow.locator('.multipart-key').fill('field1');
    await firstRow.locator('.multipart-text-value').fill('value1');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 multipart 字段
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('field1');
  });

  test('GraphQL variables 和 operationName 发送', async ({ page }) => {
    await page.locator('#method-select').selectOption('POST');
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('graphql');

    // 填写 GraphQL 查询
    await page.locator('#graphql-query').fill('query GetUser($id: ID!) { user(id: $id) { name } }');
    // 填写 variables
    await page.locator('#graphql-variables').fill('{"id": "1"}');
    // 填写 operationName
    await page.locator('#graphql-operation-name').fill('GetUser');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 GraphQL 内容
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('GetUser');
    await expect(responseBody).toContainText('variables');
  });
});
