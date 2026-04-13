import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, waitForModal, waitForModalClose } from './helpers/wait';
import { EnvironmentPage } from './pages/environment-page';


test.describe('变量系统', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('环境变量模板替换', async ({ page }) => {

    // 创建环境并添加变量
    const envName = `模板测试_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);

    // 添加变量
    await envPage.addVariable('host', 'localhost:4000');
    await envPage.saveVariables();
    await envPage.close();

    // 选择该环境
    await envPage.switchActiveEnv(envName);

    // 在 URL 中使用变量
    await sendRequestAndWait(page, 'http://{{host}}/get', '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('localhost:4000');
  });

  test('全局变量管理弹窗', async ({ page }) => {

    // 打开全局变量弹窗
    await page.locator('#btn-manage-global-vars').click();

    await waitForModal(page);
    await expect(page.locator('#modal h3')).toHaveText('管理全局变量');

    // 添加全局变量（使用唯一 key 避免并发冲突）
    const uniqueKey = `gk_${Date.now()}`;
    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill(uniqueKey);
    await firstRow.locator('.kv-value').fill('global_value');

    // 保存
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 验证全局变量数量 > 0（不精确匹配，因为其他并行测试可能也添加了变量）
    await expect(page.locator('#global-var-count')).not.toHaveText('0', { timeout: 5000 });
  });

  test('全局变量在 URL 中可用', async ({ page }) => {

    // 设置全局变量（使用唯一 key）
    const uniqueKey = `api_host_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const lastRow = page.locator('#modal .kv-row').last();
    await lastRow.locator('.kv-key').fill(uniqueKey);
    await lastRow.locator('.kv-value').fill('localhost:4000');

    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 使用变量发送请求
    await sendRequestAndWait(page, `http://{{${uniqueKey}}}/get`, '200');
  });

  test('变量预览面板', async ({ page }) => {

    // 设置全局变量
    const uniqueKey = `preview_var_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill(uniqueKey);
    await firstRow.locator('.kv-value').fill('preview_value');

    await page.locator('#modal #save-global-vars').click();

    // 打开变量预览面板
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();

    // 验证变量显示
    await expect(panel).toContainText(uniqueKey);
    await expect(panel).toContainText('preview_value');
    await expect(panel).toContainText('Global');

    // 关闭面板
    await page.locator('#btn-var-preview').click();
    await expect(panel).toBeHidden();
  });

  test('变量预览搜索功能', async ({ page }) => {

    // 设置全局变量
    const uniqueKey = `search_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('val1');

    await addBtn.click();
    await page.locator('#modal .kv-row').nth(1).locator('.kv-key').fill('other_var');
    await page.locator('#modal .kv-row').nth(1).locator('.kv-value').fill('val2');

    await page.locator('#modal #save-global-vars').click();

    // 打开变量预览
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();

    // 搜索
    await panel.locator('#var-search').fill('search_');
    await expect(panel).toContainText(uniqueKey);
    // other_var 不应包含 "search_"
    await expect(panel.locator('.var-preview-row').filter({ hasText: 'other_var' })).not.toBeVisible();
  });
});

test.describe('全局变量编辑和删除', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('编辑已存在的全局变量', async ({ page }) => {
    const key = `edit_var_${Date.now()}`;

    // 先添加一个全局变量
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    await page.locator('#modal .kv-add-btn').click();
    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill(key);
    await firstRow.locator('.kv-value').fill('original_value');

    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 再次打开编辑
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    // 找到包含该 key 的行 — 通过检查 kv-key input 的实际值
    const rows = page.locator('#modal .kv-row');
    const rowCount = await rows.count();
    let targetRow = null;
    for (let i = 0; i < rowCount; i++) {
      const keyValue = await rows.nth(i).locator('.kv-key').inputValue();
      if (keyValue === key) {
        targetRow = rows.nth(i);
        break;
      }
    }
    expect(targetRow).not.toBeNull();
    await targetRow!.locator('.kv-value').fill('updated_value');

    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 打开变量预览面板验证
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('updated_value');
  });

  test('删除全局变量行后保存', async ({ page }) => {
    const key1 = `del_var1_${Date.now()}`;
    const key2 = `del_var2_${Date.now()}`;

    // 添加两个全局变量
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(0).locator('.kv-key').fill(key1);
    await page.locator('#modal .kv-row').nth(0).locator('.kv-value').fill('val1');

    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(1).locator('.kv-key').fill(key2);
    await page.locator('#modal .kv-row').nth(1).locator('.kv-value').fill('val2');

    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 再次打开并删除第一个变量
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    // 第一个 kv-row 应该是 key1，直接删除它
    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-delete').click();

    // 保存
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 验证全局变量数量减少了
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();
    // key2 应该还在（因为只删除了第一行）
    await expect(panel).toContainText(key2);
  });
});

test.describe('环境变量管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('删除单个环境变量行', async ({ page }) => {
    const envName = `EnvDel_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);

    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });

    // 添加两个变量
    await kvEditor.locator('.kv-add-btn').click();
    await kvEditor.locator('.kv-row').nth(0).locator('.kv-key').fill('keep_var');
    await kvEditor.locator('.kv-row').nth(0).locator('.kv-value').fill('keep');

    await kvEditor.locator('.kv-add-btn').click();
    await kvEditor.locator('.kv-row').nth(1).locator('.kv-key').fill('remove_var');
    await kvEditor.locator('.kv-row').nth(1).locator('.kv-value').fill('remove');

    await kvEditor.locator('.kv-save-btn').click();

    // 删除第二个行（remove_var）
    await kvEditor.locator('.kv-row').nth(1).locator('.kv-delete').click();

    // 保存
    await kvEditor.locator('.kv-save-btn').click();
    await envPage.close();

    // 验证：选择该环境，重新打开编辑器，确认只剩一个变量
    await envPage.switchActiveEnv(envName);
    await envPage.open();
    await envPage.selectEnv(envName);

    const editor = page.locator('#modal #env-vars-editor');
    await expect(editor.locator('.kv-row')).toHaveCount(1, { timeout: 5000 });
  });
});
