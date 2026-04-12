import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { TabBar } from './pages/tab-bar';

test.describe('保存与加载请求', () => {
  let coll: CollectionPage;
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
  });

  test('保存请求到集合', async ({ page }) => {
    const colName = `保存测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.selectMethod('POST');
    await rp.setMockUrl('/post');

    await page.locator('#save-btn').click();

    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await expect(saveModal.locator('.confirm-dialog-title')).toHaveText('Save Request');
    await expect(saveModal.locator('#save-req-name')).toBeVisible();
    await expect(saveModal.locator('#save-col-select')).toBeVisible();

    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.method-badge.method-POST').first()).toBeVisible();
  });

  test('从集合加载请求', async ({ page }) => {
    const colName = `加载测试_${Date.now()}`;
    await coll.createCollection(colName);

    const testUrl = `${MOCK_BASE_URL}/put`;
    await rp.selectMethod('PUT');
    await rp.setUrl(testUrl);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.method-badge.method-PUT').first()).toBeVisible();

    await rp.setUrl('https://example.com');
    await coll.tree.locator('.method-badge.method-PUT').first().click();

    await expect(rp.urlInput).toHaveValue(testUrl);
    await expect(rp.methodSelect).toHaveValue('PUT');
  });

  test('右键复制请求', async ({ page }) => {
    const colName = `复制测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.selectMethod('DELETE');
    await rp.setMockUrl('/delete');
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const deleteBadge = coll.tree.locator('.method-badge.method-DELETE');
    await expect(deleteBadge.first()).toBeVisible();

    const countBefore = await deleteBadge.count();

    await deleteBadge.first().click({ button: 'right' });

    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible();

    await ctxMenu.locator('.context-menu-item').filter({ hasText: '复制' }).click();

    await expect(coll.tree.locator('.method-badge.method-DELETE')).toHaveCount(countBefore + 1);
  });

  test('右键删除请求', async ({ page }) => {
    const colName = `删除请求测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.selectMethod('PATCH');
    await rp.setMockUrl('/patch');
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const patchBadge = coll.tree.locator('.method-badge.method-PATCH');
    await expect(patchBadge).toBeVisible();

    await patchBadge.first().click({ button: 'right' });

    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible();

    await ctxMenu.locator('.context-menu-item').filter({ hasText: '删除' }).click();

    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible();
    await page.locator('#modal .modal-btn-danger').click();

    await expect(coll.tree.locator('.method-badge.method-PATCH')).toHaveCount(0);
  });

  test('保存时使用自定义请求名称', async ({ page }) => {
    const colName = `自定义名称_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.selectMethod('GET');
    await rp.setMockUrl('/get');

    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();

    const customName = `我的自定义请求_${Date.now()}`;
    await saveModal.locator('#save-req-name').clear();
    await saveModal.locator('#save-req-name').fill(customName);

    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.tree-item').filter({ hasText: customName })).toBeVisible();
  });

  test('取消保存不创建请求', async ({ page }) => {
    const colName = `取消测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');

    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();

    await saveModal.locator('#save-cancel').click();
    await waitForModalClose(page);

    const colTreeItem = coll.tree.locator('.tree-item').filter({ hasText: colName }).first();
    await expect(colTreeItem.locator('.method-badge')).toHaveCount(0);
  });

  test('保存到不同的集合', async ({ page }) => {
    const colA = `集合AX_${Date.now()}`;
    const colB = `集合BX_${Date.now()}`;

    await coll.createCollection(colA);
    await coll.createCollection(colB);

    await rp.setMockUrl('/get');

    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();

    const selectEl = saveModal.locator('#save-col-select');
    await selectEl.waitFor({ state: 'visible' });
    await selectEl.selectOption({ label: colB });

    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.method-badge').first()).toBeVisible();
  });

  test('修改已保存请求并再次保存', async ({ page }) => {
    const tabBar = new TabBar(page);
    const colName = `更新测试_${Date.now()}`;
    await coll.createCollection(colName);

    const originalUrl = `${MOCK_BASE_URL}/post`;
    await rp.selectMethod('POST');
    await rp.setUrl(originalUrl);

    // 第一次保存
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.method-badge.method-POST').first()).toBeVisible();

    // 修改请求
    const updatedUrl = `${MOCK_BASE_URL}/put`;
    await rp.selectMethod('PUT');
    await rp.setUrl(updatedUrl);

    // 第二次保存 — 直接更新
    await page.locator('#save-btn').click();

    await rp.setUrl('https://example.com');
    await tabBar.addTab();

    await coll.tree.locator('.method-badge.method-PUT').first().click();

    await expect(rp.urlInput).toHaveValue(updatedUrl);
    await expect(rp.methodSelect).toHaveValue('PUT');
  });
});
