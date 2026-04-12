import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab, switchResponseTab } from './helpers/wait';
import { RequestPage } from './pages/request-page';


test.describe('请求发送与响应', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('发送 GET 请求并显示响应', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('#response-time')).toBeVisible();
    await expect(page.locator('#response-size')).toBeVisible();
  });

  test('切换请求方法并发送 POST 请求', async ({ page }) => {
    const rp = new RequestPage(page);

    // 切换到 POST
    await rp.selectMethod('POST');
    await rp.setMockUrl('/post');

    // 切换到 Body 标签页
    await rp.switchTab('body');

    // body-type-select 默认已经是 json，直接填写 textarea
    await rp.fillBody('{"hello": "world"}');

    // 发送请求
    await rp.clickSend();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证响应体中包含发送的数据
    const responseBody = page.locator('#response-body');
    await expect(responseBody).toContainText('hello');
    await expect(responseBody).toContainText('world');
  });

  test('使用 Ctrl+Enter 快捷键发送请求', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.setMockUrl('/get');
    // 确保输入框聚焦后再按快捷键
    await rp.urlInput.focus();
    await rp.urlInput.press('Control+Enter');

    await expect(page.locator('#response-status')).toContainText('200');
  });

  test('切换响应标签页查看响应头', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 切换到 Headers 标签页
    await switchResponseTab(page, 'headers');
    await expect(page.locator('#response-headers')).toBeVisible();
  });

  test('HEAD 请求', async ({ page }) => {
    const rp = new RequestPage(page);

    // 切换到 HEAD 方法
    await rp.selectMethod('HEAD');
    await expect(rp.methodSelect).toHaveValue('HEAD');

    // 发送 HEAD 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // HEAD 请求应该没有响应体或响应体为空
    const responseBody = page.locator('#response-format-content');
    const bodyText = await responseBody.textContent();
    expect(bodyText).toBeFalsy();
  });

  test('PATCH 请求', async ({ page }) => {
    const rp = new RequestPage(page);

    // 切换到 PATCH 方法
    await rp.selectMethod('PATCH');
    await expect(rp.methodSelect).toHaveValue('PATCH');

    // 发送 PATCH 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/patch`, '200');

    // 验证响应包含请求信息
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('patch');
  });

  test('OPTIONS 请求', async ({ page }) => {
    const rp = new RequestPage(page);

    await rp.selectMethod('OPTIONS');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/anything`, '200');

    await expect(page.locator('#response-time')).toBeVisible();
  });
});

test.describe('重定向测试', () => {
  test('关闭重定向后收到 3xx 响应', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.navigate();

    await rp.setMockUrl('/redirect/1');

    // 关闭 Follow Redirects
    await rp.openOptions();
    await rp.disableRedirects();

    await expect(rp.urlInput).toHaveValue(`${MOCK_BASE_URL}/redirect/1`);

    await rp.clickSend();

    // 应收到 302 而不是 200
    await expect(page.locator('#response-status')).toContainText('302');
  });

  test('开启重定向时自动跟随 302', async ({ page }) => {
    await page.goto('/');

    await page.locator('#request-options-btn').click();
    await expect(page.locator('#request-redirect-toggle')).toBeChecked();

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/redirect/1`, '200');
  });
});

test.describe('请求超时行为', () => {
  test('请求超时后显示错误状态', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.navigate();

    // 设置超时为 1 秒
    await rp.openOptions();
    await rp.setTimeout(1000);

    // 发送到需要 5 秒的延迟端点
    await rp.setMockUrl('/delay/5');
    await rp.clickSend();

    // 应显示 5xx 错误状态样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    await expect(page.locator('#response-time')).toBeVisible();
  });

  test('正常请求在超时时间内完成', async ({ page }) => {
    await page.goto('/');

    // 设置超时为 10 秒
    await page.locator('#request-options-btn').click();
    const timeoutInput = page.locator('#request-timeout-input');
    await timeoutInput.fill('10000');

    // 发送到 2 秒延迟端点
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delay/2`, '200');
  });
});

test.describe('请求取消', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('发送按钮在请求中变为取消按钮', async ({ page }) => {
    const rp = new RequestPage(page);

    await rp.setMockUrl('/delay/5');
    await rp.clickSend();

    // 验证按钮变为取消状态
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'true');

    // 验证按钮显示 Cancel
    await expect(rp.sendBtn).toContainText('Cancel');

    // 点击取消
    await rp.clickSend();

    // 验证按钮恢复为 Send 状态
    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'false');
    await expect(rp.sendBtn).toContainText('Send');
  });

  test('取消请求后显示取消状态', async ({ page }) => {
    const rp = new RequestPage(page);

    await rp.setMockUrl('/delay/5');
    await rp.clickSend();

    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'true');

    // 点击取消
    await rp.clickSend();

    await expect(rp.sendBtn).toHaveAttribute('data-loading', 'false');

    // 验证显示取消错误
    await expect(page.locator('.response-error')).toBeVisible();
  });
});

test.describe('请求选项', () => {
  test('打开请求选项面板', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.navigate();

    await expect(rp.optionsPanel).toBeHidden();
    await rp.openOptions();
    await expect(rp.optionsPanel).toBeVisible();
    await expect(rp.optionsBtn).toHaveClass(/active/);

    // 再次点击关闭
    await rp.closeOptions();
    await expect(rp.optionsPanel).toBeHidden();
  });

  test('修改超时时间', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.navigate();

    await rp.openOptions();

    // 默认值 30000
    await expect(rp.timeoutInput).toHaveValue('30000');

    await rp.setTimeout(5000);

    // 切换标签页再回来验证值保留
    await rp.switchTab('body');
    await rp.switchTab('headers');
    await rp.openOptions();
    await expect(rp.timeoutInput).toHaveValue('5000');
  });

  test('切换 Follow Redirects 开关', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.navigate();

    await rp.openOptions();

    // 默认开启
    await expect(rp.redirectToggle).toBeChecked();

    // checkbox 是隐藏的，需要点击父级 label 来切换
    await rp.disableRedirects();

    // 切换标签页再回来验证
    await rp.switchTab('body');
    await rp.switchTab('headers');
    await rp.openOptions();
    await expect(rp.redirectToggle).not.toBeChecked();
  });
});

test.describe('请求头编辑器', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('切换到 Headers 标签页显示键值编辑器', async ({ page }) => {
    // 默认已经是 Headers 标签
    const rp = new RequestPage(page);
    await expect(rp.headersEditor).toBeVisible();
    await expect(rp.headersEditor.locator('.kv-row').first()).toBeVisible();
  });

  test('添加请求头', async ({ page }) => {
    const rp = new RequestPage(page);

    const addBtn = rp.headersEditor.locator('.kv-add-btn');
    await addBtn.click();
    await addBtn.click(); // 再加一行，确保有足够行

    const rows = rp.headersEditor.locator('.kv-row');
    const lastRow = rows.last();
    await lastRow.locator('.kv-key').fill('X-Custom-Header');
    await lastRow.locator('.kv-value').fill('test-value');

    // 切换标签页再切回来，验证数据保留
    await rp.switchTab('body');
    await rp.switchTab('headers');
    await expect(rows.last().locator('.kv-key')).toHaveValue('X-Custom-Header');
    await expect(rows.last().locator('.kv-value')).toHaveValue('test-value');
  });

  test('删除请求头行', async ({ page }) => {
    const rp = new RequestPage(page);

    const addBtn = rp.headersEditor.locator('.kv-add-btn');
    await addBtn.click();
    await addBtn.click();

    let rows = rp.headersEditor.locator('.kv-row');
    const count = await rows.count();

    // 删除最后一行
    await rows.last().locator('.kv-delete').click();
    rows = rp.headersEditor.locator('.kv-row');
    await expect(rows).toHaveCount(count - 1);
  });

  test('禁用请求头（取消勾选）', async ({ page }) => {
    const rp = new RequestPage(page);

    const firstRow = rp.headersEditor.locator('.kv-row').first();
    const checkbox = firstRow.locator('.kv-enabled');
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe('查询参数编辑器', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('切换到 Params 标签页显示键值编辑器', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.switchTab('params');
    await expect(rp.paramsEditor).toBeVisible();
    await expect(rp.paramsEditor.locator('.kv-row').first()).toBeVisible();
  });

  test('添加查询参数并验证请求中包含', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.switchTab('params');

    const addBtn = rp.paramsEditor.locator('.kv-add-btn');
    await addBtn.click();

    const rows = rp.paramsEditor.locator('.kv-row');
    const lastRow = rows.last();
    await lastRow.locator('.kv-key').fill('foo');
    await lastRow.locator('.kv-value').fill('bar');

    // 发送到 mock 服务器，验证参数出现在响应中
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('foo');
    await expect(responseBody).toContainText('bar');
  });
});

test.describe('并发请求', () => {
  test('多标签页同时发送请求', async ({ page }) => {
    await page.goto('/');

    // 第一个标签发送 GET
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 新建标签发送 POST
    await page.locator('.request-tab-add').click();
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill('{"tab": "second"}');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切回第一个标签验证响应保留
    await page.locator('.request-tab').nth(0).click();
    await expect(page.locator('#response-status')).toContainText('200');
  });
});

test.describe('禁用请求头验证', () => {
  test('禁用的请求头不包含在实际请求中', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    // 添加一个自定义头
    await page.locator('#tab-headers .kv-add-btn').click();
    const lastRow = page.locator('#tab-headers .kv-row').last();
    await lastRow.locator('.kv-key').fill('X-Disabled-Test');
    await lastRow.locator('.kv-value').fill('should-not-appear');

    // 禁用该头
    await lastRow.locator('.kv-enabled').uncheck();

    // 发送请求
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 响应中不应包含该头（mock /get echo headers）
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).not.toContainText('X-Disabled-Test');
  });
});
