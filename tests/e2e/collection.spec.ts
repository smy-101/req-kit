import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModal, waitForModalClose } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { ImportExportPage } from './pages/import-export-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';

test.describe('集合管理', () => {
  let coll: CollectionPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
  });

  test('创建新集合', async ({ page }) => {
    const name = `测试集合_${Date.now()}`;
    await coll.newCollectionBtn.click();

    const input = page.locator('#modal .dialog-input').first();
    await expect(input).toBeVisible();
    await input.fill(name);

    await page.locator('#modal .modal-btn-primary').click();

    await expect(coll.tree.locator('.tree-item').filter({ hasText: name })).toBeVisible();
  });

  test('创建多个集合', async ({ page }) => {
    const ts = Date.now();

    for (const name of [`集合A_${ts}`, `集合B_${ts}`, `集合C_${ts}`]) {
      await coll.newCollectionBtn.click();
      await page.locator('#modal .dialog-input').first().fill(name);
      await page.locator('#modal .modal-btn-primary').click();
      await expect(coll.tree.locator('.tree-item').filter({ hasText: name })).toBeVisible();
    }
  });

  test('删除集合', async ({ page }) => {
    const uniqueName = `删除测试_${Date.now()}`;
    await coll.createCollection(uniqueName);

    // 右键点击集合
    const treeItem = coll.tree.locator('.tree-item').filter({ hasText: uniqueName });
    await treeItem.first().click({ button: 'right' });

    // 确认删除
    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible();
    await page.locator('#modal .modal-btn-danger').click();

    // 验证集合已消失
    await expect(treeItem).not.toBeVisible();
  });

  test('右键集合只显示删除选项', async ({ page }) => {
    const colName = `右键菜单_${Date.now()}`;
    await coll.createCollection(colName);

    await coll.cancelDeleteCollection(colName);

    // 验证集合仍然存在
    await expect(coll.tree.locator('.tree-item').filter({ hasText: colName })).toBeVisible();
  });

  test('创建多个集合后每个都可以独立操作', async ({ page }) => {
    const names = [`集合A_${Date.now()}`, `集合B_${Date.now()}`, `集合C_${Date.now()}`];
    for (const name of names) {
      await coll.createCollection(name);
    }

    for (const name of names) {
      await expect(coll.tree.locator('.tree-item').filter({ hasText: name })).toBeVisible();
    }

    // 删除第二个集合
    const colB = coll.tree.locator('.tree-item').filter({ hasText: names[1] }).first();
    await colB.click({ button: 'right' });
    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible();
    await page.locator('#modal .modal-btn-danger').click();

    await expect(coll.tree.locator('.tree-item').filter({ hasText: names[1] })).toHaveCount(0);
    await expect(coll.tree.locator('.tree-item').filter({ hasText: names[0] })).toBeVisible();
    await expect(coll.tree.locator('.tree-item').filter({ hasText: names[2] })).toBeVisible();
  });

  test('集合中的请求右键显示复制和删除选项', async ({ page }) => {
    const rp = new RequestPage(page);
    const saveDialog = new SaveDialogPage(page);
    const colName = `请求右键_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    // 右键点击请求项
    await coll.tree.locator('.method-badge').first().click({ button: 'right' });

    await expect(coll.contextMenu).toBeVisible();
    await expect(coll.contextMenu.locator('.context-menu-item')).toHaveCount(2);
    await expect(coll.contextMenu.locator('.context-menu-item').filter({ hasText: '复制' })).toBeVisible();
    await expect(coll.contextMenu.locator('.context-menu-item').filter({ hasText: '删除' })).toBeVisible();
  });
});

test.describe('集合请求上下文菜单与 curl 导入', () => {
  let coll: CollectionPage;
  let imexPage: ImportExportPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
    imexPage = new ImportExportPage(page);
  });

  test('右键复制请求在集合中创建副本', async ({ page }) => {
    const rp = new RequestPage(page);
    const saveDialog = new SaveDialogPage(page);
    const colName = `复制测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');

    // 保存请求到集合
    await saveDialog.save(colName);

    const colWrapper = coll.tree.locator('[data-collection-id]').filter({ hasText: colName }).first();
    await expect(colWrapper.locator('.method-badge').first()).toBeVisible();

    // 右键请求触发上下文菜单
    await colWrapper.locator('.method-badge').first().click({ button: 'right' });
    await expect(coll.contextMenu).toBeVisible();

    await coll.contextMenu.locator('.context-menu-item').filter({ hasText: '复制' }).click();
    await expect(coll.contextMenu).not.toBeVisible();

    // 验证集合中有两个请求
    await expect(colWrapper.locator('.method-badge')).toHaveCount(2);
  });

  test('导入 curl 命令到指定集合', async ({ page }) => {
    await imexPage.open();
    await imexPage.importCurl(`curl '${MOCK_BASE_URL}/get'`);

    await expect(coll.tree.locator('.method-badge.method-GET').first()).toBeVisible();
  });

  test('导入 POST curl 命令验证方法', async ({ page }) => {
    await imexPage.open();
    await imexPage.importContent.fill(`curl -X POST '${MOCK_BASE_URL}/post' -H 'Content-Type: application/json' -d '{"key":"val"}'`);
    await imexPage.importActionBtn.click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.method-badge.method-POST').first()).toBeVisible();
  });
});

test.describe('集合变量', () => {
  let coll: CollectionPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
  });

  test('集合变量按钮存在', async ({ page }) => {
    const colName = `变量集合_${Date.now()}`;
    await coll.createCollection(colName);

    const treeItem = coll.tree.locator('.tree-item').filter({ hasText: colName });
    await expect(treeItem.locator('.coll-var-btn')).toBeVisible();
  });

  test('打开集合变量编辑器', async ({ page }) => {
    const colName = `变量编辑_${Date.now()}`;
    await coll.createCollection(colName);

    await coll.openCollectionVars(colName);

    await expect(page.locator('#modal h3')).toContainText(colName);
    await expect(page.locator('#modal #coll-var-editor')).toBeVisible();

    await page.locator('#modal #close-coll-var-modal').click();
    await waitForModalClose(page);
  });

  test('添加并保存集合变量', async ({ page }) => {
    const colName = `保存变量_${Date.now()}`;
    await coll.createCollection(colName);

    await coll.openCollectionVars(colName);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill('coll_host');
    await firstRow.locator('.kv-value').fill('localhost:4000');

    await page.locator('#modal #save-coll-vars').click();
    await waitForModalClose(page);

    const treeItem = coll.tree.locator('.tree-item').filter({ hasText: colName });
    await expect(treeItem.locator('.coll-var-indicator')).toBeVisible();
  });

  test('集合变量 badge 显示正确数量', async ({ page }) => {
    const colName = `变量数量_${Date.now()}`;
    await coll.createCollection(colName);

    await coll.openCollectionVars(colName);

    // 添加 3 个变量
    for (let i = 1; i <= 3; i++) {
      await page.locator('#modal .kv-add-btn').click();
      const row = page.locator('#modal .kv-row').nth(i);
      await row.locator('.kv-key').fill(`key${i}`);
      await row.locator('.kv-value').fill(`val${i}`);
    }

    await page.locator('#modal #save-coll-vars').click();
    await waitForModalClose(page);

    // 验证 badge 显示 {3}
    const treeItem = coll.tree.locator('.tree-item').filter({ hasText: colName });
    await expect(treeItem.locator('.coll-var-indicator')).toContainText('{3}');
  });
});
