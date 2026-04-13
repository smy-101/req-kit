import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose, uniqueId, runCollection } from './helpers/wait';
import { EnvironmentPage } from './pages/environment-page';
import { VariablePage } from './pages/variable-page';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';
import { TabBar } from './pages/tab-bar';

test.describe('完整变量优先级链', () => {
  let varPage: VariablePage;
  let envPage: EnvironmentPage;
  let rp: RequestPage;
  let coll: CollectionPage;
  let tabBar: TabBar;
  let saveDialog: SaveDialogPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    varPage = new VariablePage(page);
    envPage = new EnvironmentPage(page);
    rp = new RequestPage(page);
    coll = new CollectionPage(page);
    tabBar = new TabBar(page);
    saveDialog = new SaveDialogPage(page);
  });

  test('Runtime > Collection > Environment > Global 全链路优先级', async ({ page }) => {
    const varKey = `priority_full_${crypto.randomUUID()}`;

    // 1. 设置 Global 变量
    await varPage.openGlobalVars();
    await varPage.addGlobalVar(varKey, 'global_value');
    await varPage.saveGlobalVars();

    // 2. 创建 Environment 并设置同名变量
    const envName = uniqueId('FullPriorityEnv_');
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable(varKey, 'env_value');
    await envPage.saveVariables();
    await envPage.close();
    await envPage.switchActiveEnv(envName);

    // 3. 创建 Collection 并设置 Collection 变量
    const colName = uniqueId('FullPriorityCol_');
    await coll.createCollection(colName);
    await coll.openCollectionVars(colName);
    const kvEditor = page.locator('#modal #coll-var-editor');
    await kvEditor.locator('.kv-add-btn').waitFor({ state: 'visible' });
    await kvEditor.locator('.kv-add-btn').click();
    await kvEditor.locator('.kv-row').first().locator('.kv-key').fill(varKey);
    await kvEditor.locator('.kv-row').first().locator('.kv-value').fill('coll_value');
    await page.locator('#modal #save-coll-vars').click();
    await waitForModalClose(page);

    // 4. 保存请求到集合（使标签关联集合）
    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    // 5. 设置 Runtime 变量 — 通过 post-response script
    await rp.fillPostScript(`variables.set("${varKey}", "runtime_value")`);
    await rp.clickSend();
    await expect(page.locator('#response-status')).toContainText('200');

    // 6. 新请求使用同名变量 — Runtime 应优先
    await tabBar.addTab();
    await rp.selectMethod('POST');
    await rp.setUrl(`${MOCK_BASE_URL}/post`);
    await rp.switchTab('body');
    await rp.selectBodyType('json');
    await rp.fillBody(`{"result": "{{${varKey}}}"}`);
    await rp.clickSend();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证 runtime_value 胜出
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('runtime_value');
    await expect(responseBody).not.toContainText('coll_value');
    await expect(responseBody).not.toContainText('env_value');
    await expect(responseBody).not.toContainText('global_value');
  });
});
