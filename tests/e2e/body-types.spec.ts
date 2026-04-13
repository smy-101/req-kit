import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, waitForToast } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';


test.describe('Body 编辑器', () => {
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
      await page.goto("/");
      rp = new RequestPage(page);
    });

  test('切换 Body 类型显示对应编辑器', async ({ page }) => {
    await rp.switchTab('body');

    // 默认 JSON — textarea 可见
    await expect(rp.bodyTextarea).toBeVisible();

    // 切换到 None
    await rp.selectBodyType('none');
    await expect(rp.bodyTextarea).toBeHidden();

    // 切换到 Text
    await rp.selectBodyType('text');
    await expect(rp.bodyTextarea).toBeVisible();

    // 切换到 XML
    await rp.selectBodyType('xml');
    await expect(rp.bodyTextarea).toBeVisible();

    // 切换到 Form URL Encoded — textarea 仍然可见（KV editor 在 tab-params）
    await rp.selectBodyType('form');
    await expect(rp.bodyTextarea).toBeVisible();
  });

  test('切换到 Multipart 显示分段编辑器', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('multipart');

    await expect(rp.multipartEditor).toBeVisible();
    await expect(rp.multipartRows).toHaveCount(1);
  });

  test('Multipart 添加和删除字段', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('multipart');

    await rp.multipartAddBtn.click();
    await expect(rp.multipartRows).toHaveCount(2);

    // 填写字段
    const firstRow = rp.multipartRows.first();
    await firstRow.locator('.multipart-key').fill('field1');
    await firstRow.locator('.multipart-text-value').fill('value1');

    // 删除最后一行
    await rp.multipartRows.last().locator('.multipart-delete-btn').click();
    await expect(rp.multipartRows).toHaveCount(1);
  });

  test('切换到 Binary 显示文件选择器', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('binary');

    const binaryEditor = page.locator('#binary-editor');
    await expect(binaryEditor).toBeVisible();
    await expect(binaryEditor.locator('.binary-file-btn')).toBeVisible();
  });

  test('切换到 GraphQL 显示查询编辑器', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('graphql');

    const graphqlEditor = page.locator('#graphql-editor');
    await expect(graphqlEditor).toBeVisible();
    await expect(rp.graphqlQuery).toBeVisible();
    await expect(rp.graphqlVariables).toBeVisible();
    await expect(rp.graphqlOperationName).toBeVisible();

    // Format 按钮文字变为 "Format Variables"
    await expect(rp.formatBodyBtn).toHaveText('Format Variables');
  });

  test('GraphQL 填写查询并发送', async ({ page }) => {
    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('graphql');

    await rp.graphqlQuery.fill('{ __typename }');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 GraphQL 查询内容
    const responsePage = new ResponsePage(page);
    await expect(responsePage.formatContent).toContainText('__typename');
  });

  test('Format JSON 按钮格式化 JSON 内容', async ({ page }) => {
    await rp.switchTab('body');

    await rp.bodyTextarea.fill('{"a":1,"b":2}');

    await rp.formatBody();

    // 验证格式化后的内容包含缩进
    const value = await rp.bodyTextarea.inputValue();
    expect(value).toContain('\n');
    expect(value).toContain('  ');
  });
});

test.describe('Body 类型发送验证', () => {
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
  });

  test('Form URL Encoded body 发送', async ({ page }) => {
    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('form');

    // Form 类型使用 textarea 输入 URL 编码格式的数据
    await rp.bodyTextarea.fill('username=testuser');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 form 数据
    const responsePage = new ResponsePage(page);
    await expect(responsePage.formatContent).toContainText('username');
    await expect(responsePage.formatContent).toContainText('testuser');
  });

  test('Multipart body 发送', async ({ page }) => {
    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('multipart');

    // 填写 multipart 字段
    const firstRow = rp.multipartRows.first();
    await firstRow.locator('.multipart-key').fill('field1');
    await firstRow.locator('.multipart-text-value').fill('value1');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 multipart 字段
    const responsePage = new ResponsePage(page);
    await expect(responsePage.formatContent).toContainText('field1');
  });

  test('GraphQL variables 和 operationName 发送', async ({ page }) => {
    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('graphql');

    // 填写 GraphQL 查询
    await rp.graphqlQuery.fill('query GetUser($id: ID!) { user(id: $id) { name } }');
    // 填写 variables
    await rp.graphqlVariables.fill('{"id": "1"}');
    // 填写 operationName
    await rp.graphqlOperationName.fill('GetUser');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 验证响应包含 GraphQL 内容
    const responsePage = new ResponsePage(page);
    await expect(responsePage.formatContent).toContainText('GetUser');
    await expect(responsePage.formatContent).toContainText('variables');
  });
});

test.describe('Body 格式化错误处理', () => {
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
  });

  test('Format JSON 对无效 JSON 显示错误 toast', async ({ page }) => {
    await rp.switchTab('body');
    await rp.bodyTextarea.fill('not valid json');

    await rp.formatBody();

    await waitForToast(page);
  });

  test('Format GraphQL Variables 对无效 JSON 显示错误 toast', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('graphql');

    await rp.graphqlQuery.fill('{ __typename }');
    await rp.graphqlVariables.fill('{ invalid }');

    // 点击 "Format Variables"
    await rp.formatBody();

    await waitForToast(page);
  });
});
