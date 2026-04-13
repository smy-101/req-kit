import { test, expect } from './fixtures';
import { sendRequestAndWait, waitForModal, waitForModalClose, switchRequestTab } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';
import { EnvironmentPage } from './pages/environment-page';
import { VariablePage } from './pages/variable-page';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';


test.describe('变量在 Headers 和 Body 中的替换', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('环境变量在 Headers 中替换', async ({ page }) => {
    const envPage = new EnvironmentPage(page);
    const rp = new RequestPage(page);

    // 创建环境并添加变量
    const envName = `HeaderVar_${Date.now()}`;
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('custom_header', 'hello-from-env');
    await envPage.saveVariables();
    await envPage.close();

    // 选择该环境
    await envPage.switchActiveEnv(envName);

    // 在 Headers 标签页使用变量
    await rp.switchTab('headers');
    await rp.addHeaderRow('X-Custom-Header', '{{custom_header}}');

    // 发送 POST 请求到 httpbin /post 验证 header
    await rp.selectMethod('POST');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('hello-from-env');
  });

  test('环境变量在 Body 中替换', async ({ page }) => {
    const envPage = new EnvironmentPage(page);
    const rp = new RequestPage(page);

    // 创建环境并添加变量
    const envName = `BodyVar_${Date.now()}`;
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('msg', 'hello-body-var');
    await envPage.saveVariables();
    await envPage.close();

    // 选择该环境
    await envPage.switchActiveEnv(envName);

    // 在 Body 中使用变量
    await rp.switchTab('body');
    await rp.fillBody('{"message": "{{msg}}"}');

    await rp.selectMethod('POST');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('hello-body-var');
  });
});

test.describe('变量解析增强', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
  });
  test('集合变量在请求 URL 中替换', async ({ page }) => {
    const coll = new CollectionPage(page);

    // 创建集合
    const colName = `ColVar_${Date.now()}`;
    await coll.createCollection(colName);

    // 设置集合变量
    await coll.openCollectionVars(colName);

    // 集合变量编辑器使用 #coll-var-editor
    const kvEditor = page.locator('#modal #coll-var-editor');
    await kvEditor.locator('.kv-add-btn').waitFor({ state: 'visible' });
    await kvEditor.locator('.kv-add-btn').click();
    const collKey = `coll_host_${Date.now()}`;
    await kvEditor.locator('.kv-row').first().locator('.kv-key').fill(collKey);
    await kvEditor.locator('.kv-row').first().locator('.kv-value').fill('localhost:4000');
    // 集合变量保存按钮是 #save-coll-vars
    await page.locator('#modal #save-coll-vars').click();
    await waitForModalClose(page);

    // 保存一个请求到该集合（使标签关联集合）
    await page.locator('#url-input').fill(`http://{{${collKey}}}/get`);
    await page.locator('#save-btn').click();
    await waitForModal(page);
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    // 重新填写 URL（保存后可能清空）
    await sendRequestAndWait(page, `http://{{${collKey}}}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('localhost:4000');
  });

  test('环境变量优先于全局变量', async ({ page }) => {
    const varPage = new VariablePage(page);
    const envPage = new EnvironmentPage(page);
    const rp = new RequestPage(page);

    const varKey = `priority_${Date.now()}`;

    // 设置全局变量
    await varPage.openGlobalVars();
    await varPage.addGlobalVar(varKey, 'global_value');
    await varPage.saveGlobalVars();

    // 创建环境并设置同名变量
    const envName = `PriorityEnv_${Date.now()}`;
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable(varKey, 'env_value');
    await envPage.saveVariables();
    await envPage.close();

    // 选择该环境
    await envPage.switchActiveEnv(envName);

    // 在 Body 中使用同名变量
    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.fillBody(`{"result": "{{${varKey}}}"}`);

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('env_value');
    await expect(responseBody).not.toContainText('global_value');
  });

  test('多个标签页各自保留独立状态', async ({ page }) => {
    const rp = new RequestPage(page);

    // 在第一个标签页设置 URL
    await rp.setUrl(`${MOCK_BASE_URL}/get`);

    // 创建第二个标签
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // 在第二个标签页设置不同 URL
    await rp.setUrl(`${MOCK_BASE_URL}/post`);

    // 切换回第一个标签页
    await page.locator('.request-tab').first().click();

    // 验证第一个标签页保留了原来的 URL
    await expect(rp.urlInput).toHaveValue(`${MOCK_BASE_URL}/get`);

    // 切换到第二个标签页
    await page.locator('.request-tab').nth(1).click();

    // 验证第二个标签页保留了 POST URL
    await expect(rp.urlInput).toHaveValue(`${MOCK_BASE_URL}/post`);
  });

  test('从不同标签页发送请求响应显示在正确标签', async ({ page }) => {
    const rp = new RequestPage(page);

    // 在第一个标签页发送 GET 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 创建第二个标签页
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // 在第二个标签页发送 POST 请求
    await rp.selectMethod('POST');
    await rp.setUrl(`${MOCK_BASE_URL}/post`);
    await rp.switchTab('body');
    await rp.fillBody('{"tab": "two"}');
    await rp.clickSend();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证第二个标签页的响应包含 POST 数据
    const tab2Body = await page.locator('#response-format-content').textContent();
    expect(tab2Body).toContain('tab');

    // 切换回第一个标签页
    await page.locator('.request-tab').first().click();

    // 验证第一个标签页仍然显示 GET 请求的响应（不是 POST 的）
    // httpbin /get 响应不包含 "tab": "two"
    await expect(page.locator('#response-format-content')).not.toContainText('"two"');
  });
});
