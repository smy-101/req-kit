import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, waitForModal, waitForModalClose } from './helpers/wait';
import { EnvironmentPage } from './pages/environment-page';
import { VariablePage } from './pages/variable-page';
import { ResponsePage } from './pages/response-page';


test.describe('变量系统', () => {
  let varPage: VariablePage;

  test.beforeEach(async ({ page }) => {
      await page.goto("/");
      varPage = new VariablePage(page);
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

    const responsePage = new ResponsePage(page);
    await expect(responsePage.formatContent).toContainText('localhost:4000');
  });

  test('全局变量管理弹窗', async ({ page }) => {

    // 打开全局变量弹窗
    await varPage.openGlobalVars();

    // 添加全局变量（使用唯一 key 避免并发冲突）
    const uniqueKey = `gk_${Date.now()}`;
    await varPage.addGlobalVar(uniqueKey, 'global_value');

    // 保存
    await varPage.saveGlobalVars();

    // 重新打开验证该变量存在
    await varPage.openGlobalVars();
    const rows = page.locator('#modal .kv-row');
    const rowCount = await rows.count();
    let found = false;
    for (let i = 0; i < rowCount; i++) {
      const kv = await rows.nth(i).locator('.kv-key').inputValue();
      if (kv === uniqueKey) { found = true; break; }
    }
    expect(found).toBeTruthy();
    await varPage.saveGlobalVars();
  });

  test('全局变量在 URL 中可用', async ({ page }) => {

    // 设置全局变量（使用唯一 key）
    const uniqueKey = `api_host_${Date.now()}`;
    await varPage.openGlobalVars();

    await varPage.addGlobalVar(uniqueKey, 'localhost:4000');

    await varPage.saveGlobalVars();

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
    await varPage.openGlobalVars();

    await varPage.addGlobalVar(uniqueKey, 'val1');
    await varPage.addGlobalVar('other_var', 'val2');

    await varPage.saveGlobalVars();

    // 打开变量预览
    await varPage.openVarPreview();
    const panel = varPage.varPreviewPanel;
    await expect(panel).toBeVisible();

    // 搜索
    await panel.locator('#var-search').fill('search_');
    await expect(panel).toContainText(uniqueKey);
    // other_var 不应包含 "search_"
    await expect(panel.locator('.var-preview-row').filter({ hasText: 'other_var' })).not.toBeVisible();
  });
});

test.describe('全局变量编辑和删除', () => {
  let varPage: VariablePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    varPage = new VariablePage(page);
  });

  test('编辑已存在的全局变量', async ({ page }) => {
    const key = `edit_var_${Date.now()}`;

    // 先添加一个全局变量
    await varPage.openGlobalVars();
    await varPage.addGlobalVar(key, 'original_value');
    await varPage.saveGlobalVars();

    // 再次打开编辑
    await varPage.openGlobalVars();

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

    await varPage.saveGlobalVars();

    // 打开变量预览面板验证
    await varPage.openVarPreview();
    const panel = varPage.varPreviewPanel;
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('updated_value');
  });

  test('删除全局变量行后保存', async ({ page }) => {
    const key1 = `del_var1_${Date.now()}`;
    const key2 = `del_var2_${Date.now()}`;

    // 添加两个全局变量
    await varPage.openGlobalVars();

    await varPage.addGlobalVar(key1, 'val1');
    await varPage.addGlobalVar(key2, 'val2');

    await varPage.saveGlobalVars();

    // 再次打开并删除第一个变量
    await varPage.openGlobalVars();

    // 第一个 kv-row 应该是 key1，直接删除它
    await varPage.deleteGlobalVar(0);

    // 保存
    await varPage.saveGlobalVars();

    // 验证全局变量数量减少了
    await varPage.openVarPreview();
    const panel = varPage.varPreviewPanel;
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

    await expect(envPage.kvEditor.locator('.kv-add-btn')).toBeVisible();

    // 添加两个变量
    await envPage.addVariable('keep_var', 'keep');
    await envPage.addVariable('remove_var', 'remove');

    await envPage.saveVariables();

    // 删除第二个行（remove_var）
    await envPage.deleteVariable(1);

    // 保存
    await envPage.saveVariables();
    await envPage.close();

    // 验证：选择该环境，重新打开编辑器，确认只剩一个变量
    await envPage.switchActiveEnv(envName);
    await envPage.open();
    await envPage.selectEnv(envName);

    await expect(envPage.kvEditor.locator('.kv-row')).toHaveCount(1);
  });
});
