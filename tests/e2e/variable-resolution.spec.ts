import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

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
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.locator('#send-btn').click();

    await expect(page.locator('#response-status')).toContainText('200');
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
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.locator('#send-btn').click();

    await expect(page.locator('#response-status')).toContainText('200');
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('hello-body-var');
  });
});

test.describe('变量解析增强', () => {
  test('集合变量在请求 URL 中替换', async ({ page }) => {
    await page.goto('/');

    // 创建集合
    const colName = `ColVar_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 设置集合变量
    const colItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await colItem.hover();
    const varBtn = colItem.locator('.coll-var-btn');
    await expect(varBtn).toBeVisible({ timeout: 5000 });
    await varBtn.click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 集合变量编辑器使用 #coll-var-editor
    const kvEditor = page.locator('#modal #coll-var-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });
    await kvEditor.locator('.kv-add-btn').click();
    const collKey = `coll_host_${Date.now()}`;
    await kvEditor.locator('.kv-row').first().locator('.kv-key').fill(collKey);
    await kvEditor.locator('.kv-row').first().locator('.kv-value').fill('localhost:4000');
    // 集合变量保存按钮是 #save-coll-vars
    await page.locator('#modal #save-coll-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 保存一个请求到该集合（使标签关联集合）
    await page.locator('#url-input').fill(`http://{{${collKey}}}/get`);
    await page.waitForTimeout(400);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 重新填写 URL（保存后可能清空）
    await page.locator('#url-input').fill(`http://{{${collKey}}}/get`);
    await page.waitForTimeout(400);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('localhost:4000', { timeout: 5000 });
  });

  test('环境变量优先于全局变量', async ({ page }) => {
    await page.goto('/');

    const varKey = `priority_${Date.now()}`;

    // 设置全局变量
    await page.locator('#btn-manage-global-vars').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(varKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('global_value');
    await page.locator('#modal #save-global-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();

    // 创建环境并设置同名变量
    const envName = `PriorityEnv_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });
    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });
    await kvEditor.locator('.kv-add-btn').click();
    await kvEditor.locator('.kv-row').first().locator('.kv-key').fill(varKey);
    await kvEditor.locator('.kv-row').first().locator('.kv-value').fill('env_value');
    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());
    await page.locator('#modal #close-env-modal').click();

    // 选择该环境
    await page.locator('#active-env').selectOption({ label: envName });

    // 在 Body 中使用同名变量
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-textarea').fill(`{"result": "{{${varKey}}}"}`);
    await page.waitForTimeout(300);

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('env_value');
    await expect(responseBody).not.toContainText('global_value');
  });

  test('多个标签页各自保留独立状态', async ({ page }) => {
    await page.goto('/');

    // 在第一个标签页设置 URL
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.waitForTimeout(400);

    // 创建第二个标签
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // 在第二个标签页设置不同 URL
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.waitForTimeout(400);

    // 切换回第一个标签页
    await page.locator('.request-tab').first().click();
    await page.waitForTimeout(300);

    // 验证第一个标签页保留了原来的 URL
    await expect(page.locator('#url-input')).toHaveValue(`${MOCK_BASE_URL}/get`);

    // 切换到第二个标签页
    await page.locator('.request-tab').nth(1).click();
    await page.waitForTimeout(300);

    // 验证第二个标签页保留了 POST URL
    await expect(page.locator('#url-input')).toHaveValue(`${MOCK_BASE_URL}/post`);
  });

  test('从不同标签页发送请求响应显示在正确标签', async ({ page }) => {
    await page.goto('/');

    // 在第一个标签页发送 GET 请求
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.waitForTimeout(400);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 创建第二个标签页
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // 在第二个标签页发送 POST 请求
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#body-textarea').fill('{"tab": "two"}');
    await page.waitForTimeout(300);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证第二个标签页的响应包含 POST 数据
    const tab2Body = await page.locator('#response-format-content').textContent();
    expect(tab2Body).toContain('tab');

    // 切换回第一个标签页
    await page.locator('.request-tab').first().click();
    await page.waitForTimeout(300);

    // 验证第一个标签页仍然显示 GET 请求的响应（不是 POST 的）
    // httpbin /get 响应不包含 "tab": "two"
    await expect(page.locator('#response-format-content')).not.toContainText('"two"');
  });
});
