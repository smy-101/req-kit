import { test, expect } from './fixtures';
import { waitForModal, waitForModalClose } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('导入导出', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('导入/导出弹窗打开', async ({ page }) => {
    await page.locator('#btn-import').click();

    await waitForModal(page);
    await expect(page.locator('#modal h3')).toHaveText('Import / Export');

    await expect(page.locator('#imex-import')).toBeVisible();
    await expect(page.locator('#imex-export')).toBeHidden();
  });

  test('导入/导出弹窗切换标签', async ({ page }) => {
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('[data-imex-tab="export"]').click();
    await expect(page.locator('#imex-export')).toBeVisible();
    await expect(page.locator('#imex-import')).toBeHidden();

    await page.locator('[data-imex-tab="import"]').click();
    await expect(page.locator('#imex-import')).toBeVisible();
    await expect(page.locator('#imex-export')).toBeHidden();
  });

  test('导入 curl 命令', async ({ page }) => {
    const colName = `导入测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first()).toBeVisible({ timeout: 10000 });

    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('#import-type').selectOption('curl');
    await page.locator('#import-content').fill(`curl '${MOCK_BASE_URL}/get'`);

    await page.locator('#import-action-btn').click();

    await waitForModalClose(page, { timeout: 10000 });

    await expect(page.locator('#collection-tree .method-badge').first()).toBeVisible();
  });

  test('导入 Postman Collection', async ({ page }) => {
    const colName = `Postman_${Date.now()}`;

    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('#import-type').selectOption('postman');

    const postmanJson = JSON.stringify({
      info: { name: colName, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Test Request',
          request: { method: 'GET', url: `${MOCK_BASE_URL}/get`, header: [{ key: 'Accept', value: 'application/json' }] },
        },
      ],
    });

    await page.locator('#import-content').fill(postmanJson);

    await page.locator('#import-action-btn').click();

    await waitForModalClose(page, { timeout: 10000 });

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first()).toBeVisible();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: 'Test Request' }).first()).toBeVisible();
  });

  test('关闭导入导出弹窗', async ({ page }) => {
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('#close-imex-modal').click();
    await waitForModalClose(page);
  });

  test('导出集合为 Postman 格式', async ({ page }) => {
    const colName = `导出测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 打开导入/导出弹窗并切换到导出标签
    await page.locator('#btn-import').click();
    await waitForModal(page);
    await page.locator('[data-imex-tab="export"]').click();
    await expect(page.locator('#imex-export')).toBeVisible();

    await expect(page.locator('.export-list-item').filter({ hasText: colName })).toBeVisible();

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const exportItem = page.locator('.export-list-item').filter({ hasText: colName });
    await exportItem.locator('.export-col-btn').click();

    await expect(exportItem.locator('.export-col-btn')).toContainText('Copied!');
  });

  test('导出标签页显示空列表', async ({ page }) => {
    await page.locator('#btn-import').click();
    await waitForModal(page);
    await page.locator('[data-imex-tab="export"]').click();

    await expect(page.locator('.export-hint')).toBeVisible();
  });
});

test.describe('导入边界情况', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('导入无效 JSON 显示错误', async ({ page }) => {
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('#import-type').selectOption('postman');
    await page.locator('#import-content').fill('{ invalid json }}}');

    await page.locator('#import-action-btn').click();

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
  });

  test('导入空内容不执行导入', async ({ page }) => {
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('#import-type').selectOption('postman');
    await page.locator('#import-content').fill('');

    await page.locator('#import-action-btn').click();

    // 空内容被静默忽略：模态框保持打开，无 toast 出现
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('.toast')).not.toBeVisible();
  });

  test('导入畸形 curl 命令', async ({ page }) => {
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('#import-type').selectOption('curl');
    await page.locator('#import-content').fill('not a valid curl command');

    await page.locator('#import-action-btn').click();

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
  });
});
