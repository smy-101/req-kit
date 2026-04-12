import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose } from './helpers/wait';

test.describe('保存与加载请求', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('保存请求到集合', async ({ page }) => {
    const colName = `保存测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);

    await page.locator('#save-btn').click();

    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await expect(saveModal.locator('.confirm-dialog-title')).toHaveText('Save Request');
    await expect(saveModal.locator('#save-req-name')).toBeVisible();
    await expect(saveModal.locator('#save-col-select')).toBeVisible();

    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(page.locator('#collection-tree .method-badge.method-POST').first()).toBeVisible();
  });

  test('从集合加载请求', async ({ page }) => {
    const colName = `加载测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    const testUrl = `${MOCK_BASE_URL}/put`;
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(testUrl);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(page.locator('#collection-tree .method-badge.method-PUT').first()).toBeVisible();

    await page.locator('#url-input').fill('https://example.com');
    await page.locator('#collection-tree .method-badge.method-PUT').first().click();

    await expect(page.locator('#url-input')).toHaveValue(testUrl);
    await expect(page.locator('#method-select')).toHaveValue('PUT');
  });

  test('右键复制请求', async ({ page }) => {
    const colName = `复制测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('DELETE');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delete`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const deleteBadge = page.locator('#collection-tree .method-badge.method-DELETE');
    await expect(deleteBadge.first()).toBeVisible();

    const countBefore = await deleteBadge.count();

    await deleteBadge.first().click({ button: 'right' });

    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible();

    await ctxMenu.locator('.context-menu-item').filter({ hasText: '复制' }).click();

    await expect(page.locator('#collection-tree .method-badge.method-DELETE')).toHaveCount(countBefore + 1);
  });

  test('右键删除请求', async ({ page }) => {
    const colName = `删除请求测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('PATCH');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/patch`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const patchBadge = page.locator('#collection-tree .method-badge.method-PATCH');
    await expect(patchBadge).toBeVisible();

    await patchBadge.first().click({ button: 'right' });

    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible();

    await ctxMenu.locator('.context-menu-item').filter({ hasText: '删除' }).click();

    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible();
    await page.locator('#modal .modal-btn-danger').click();

    await expect(page.locator('#collection-tree .method-badge.method-PATCH')).toHaveCount(0);
  });

  test('保存时使用自定义请求名称', async ({ page }) => {
    const colName = `自定义名称_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('GET');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();

    const customName = `我的自定义请求_${Date.now()}`;
    await saveModal.locator('#save-req-name').clear();
    await saveModal.locator('#save-req-name').fill(customName);

    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: customName })).toBeVisible();
  });

  test('取消保存不创建请求', async ({ page }) => {
    const colName = `取消测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();

    await saveModal.locator('#save-cancel').click();
    await waitForModalClose(page);

    const colTreeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await expect(colTreeItem.locator('.method-badge')).toHaveCount(0);
  });

  test('保存到不同的集合', async ({ page }) => {
    const colA = `集合AX_${Date.now()}`;
    const colB = `集合BX_${Date.now()}`;

    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colA);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colA })).toBeVisible({ timeout: 10000 });

    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colB);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colB })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();

    const selectEl = saveModal.locator('#save-col-select');
    await selectEl.waitFor({ state: 'visible' });
    await selectEl.selectOption({ label: colB });

    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(page.locator('#collection-tree .method-badge').first()).toBeVisible();
  });

  test('修改已保存请求并再次保存', async ({ page }) => {
    const colName = `更新测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    const originalUrl = `${MOCK_BASE_URL}/post`;
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(originalUrl);

    // 第一次保存
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(page.locator('#collection-tree .method-badge.method-POST').first()).toBeVisible();

    // 修改请求
    const updatedUrl = `${MOCK_BASE_URL}/put`;
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(updatedUrl);

    // 第二次保存 — 直接更新
    await page.locator('#save-btn').click();

    await page.locator('#url-input').fill('https://example.com');
    await page.locator('.request-tab-add').click();

    await page.locator('#collection-tree .method-badge.method-PUT').first().click();

    await expect(page.locator('#url-input')).toHaveValue(updatedUrl);
    await expect(page.locator('#method-select')).toHaveValue('PUT');
  });
});
