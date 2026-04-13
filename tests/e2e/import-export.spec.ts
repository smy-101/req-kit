import { test, expect } from './fixtures';
import { waitForModalClose, waitForToast } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';
import { CollectionPage } from './pages/collection-page';
import { ImportExportPage } from './pages/import-export-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';

test.describe('导入导出', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let imexPage: ImportExportPage;

  test.beforeEach(async ({ page }) => {
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    imexPage = new ImportExportPage(page);
    await page.goto('/');
  });

  test('导入/导出弹窗打开', async ({ page }) => {
    await imexPage.open();

    await expect(imexPage.modalTitle).toHaveText('Import / Export');

    await expect(imexPage.importTab).toBeVisible();
    await expect(imexPage.exportTab).toBeHidden();
  });

  test('导入/导出弹窗切换标签', async ({ page }) => {
    await imexPage.open();

    await imexPage.switchTab('export');
    await expect(imexPage.exportTab).toBeVisible();
    await expect(imexPage.importTab).toBeHidden();

    await imexPage.switchTab('import');
    await expect(imexPage.importTab).toBeVisible();
    await expect(imexPage.exportTab).toBeHidden();
  });

  test('导入 curl 命令', async ({ page }) => {
    const colName = `导入测试_${Date.now()}`;
    await coll.createCollection(colName);

    await imexPage.open();
    await imexPage.importCurl(`curl '${MOCK_BASE_URL}/get'`);

    await expect(page.locator('#collection-tree .method-badge').first()).toBeVisible();
  });

  test('导入 Postman Collection', async ({ page }) => {
    const colName = `Postman_${Date.now()}`;

    await imexPage.open();

    const postmanJson = JSON.stringify({
      info: { name: colName, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Test Request',
          request: { method: 'GET', url: `${MOCK_BASE_URL}/get`, header: [{ key: 'Accept', value: 'application/json' }] },
        },
      ],
    });

    await imexPage.importPostman(postmanJson);

    await expect(coll.tree.locator('.tree-item').filter({ hasText: colName }).first()).toBeVisible();
    await expect(coll.tree.locator('.tree-item').filter({ hasText: 'Test Request' }).first()).toBeVisible();
  });

  test('关闭导入导出弹窗', async ({ page }) => {
    await imexPage.open();
    await imexPage.close();
  });

  test('导出集合为 Postman 格式', async ({ page }) => {
    const colName = `导出测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.selectMethod('POST');
    await rp.setMockUrl('/post');
    const saveDialog = new SaveDialogPage(page);
    await saveDialog.save(colName);

    // 打开导入/导出弹窗并切换到导出标签
    await imexPage.open();
    await imexPage.switchTab('export');
    await expect(imexPage.exportTab).toBeVisible();

    const exportItem = imexPage.exportListItem.filter({ hasText: colName });
    await expect(exportItem).toBeVisible();

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await imexPage.exportCollection(colName);

    await expect(exportItem.locator('.export-col-btn')).toContainText('Copied!');
  });

  test('导出标签页显示空列表', async ({ page }) => {
    await imexPage.open();
    await imexPage.switchTab('export');

    await expect(imexPage.exportHint).toBeVisible();
  });
});

test.describe('导入边界情况', () => {
  let imexPage: ImportExportPage;

  test.beforeEach(async ({ page }) => {
    imexPage = new ImportExportPage(page);
    await page.goto('/');
  });

  test('导入无效 JSON 显示错误', async ({ page }) => {
    await imexPage.open();

    await imexPage.importType.selectOption('postman');
    await imexPage.importContent.fill('{ invalid json }}}');
    await imexPage.importActionBtn.click();

    await waitForToast(page);
  });

  test('导入空内容不执行导入', async ({ page }) => {
    await imexPage.open();

    await imexPage.importType.selectOption('postman');
    await imexPage.importContent.fill('');
    await imexPage.importActionBtn.click();

    // 空内容被静默忽略：模态框保持打开，无 toast 出现
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('.toast')).not.toBeVisible();
  });

  test('导入畸形 curl 命令', async ({ page }) => {
    await imexPage.open();

    await imexPage.importType.selectOption('curl');
    await imexPage.importContent.fill('not a valid curl command');
    await imexPage.importActionBtn.click();

    await waitForToast(page);
  });
});
