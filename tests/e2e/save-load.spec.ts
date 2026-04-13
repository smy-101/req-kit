import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose, uniqueId } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';
import { TabBar } from './pages/tab-bar';

test.describe('保存与加载请求', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let saveDialog: SaveDialogPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    saveDialog = new SaveDialogPage(page);
  });

  test('保存请求到集合', async ({ page }) => {
    const colName = uniqueId('保存测试_');
    await coll.createCollection(colName);

    await rp.selectMethod('POST');
    await rp.setMockUrl('/post');

    await saveDialog.open();
    await expect(saveDialog.modal.locator('.confirm-dialog-title')).toHaveText('Save Request');
    await expect(saveDialog.nameInput).toBeVisible();
    await expect(saveDialog.colSelect).toBeVisible();

    await saveDialog.colSelect.selectOption({ label: colName });
    await saveDialog.confirmBtn.click();
    await waitForModalClose(page);

    await expect(coll.tree.locator('.method-badge.method-POST').first()).toBeVisible();
  });

  test('从集合加载请求', async ({ page }) => {
    const colName = uniqueId('加载测试_');
    await coll.createCollection(colName);

    const testUrl = `${MOCK_BASE_URL}/put`;
    await rp.selectMethod('PUT');
    await rp.setUrl(testUrl);
    await saveDialog.save(colName);

    await expect(coll.tree.locator('.method-badge.method-PUT').first()).toBeVisible();

    await rp.setUrl('https://example.com');
    await coll.tree.locator('.method-badge.method-PUT').first().click();

    await expect(rp.urlInput).toHaveValue(testUrl);
    await expect(rp.methodSelect).toHaveValue('PUT');
  });

  test('右键复制请求', async ({ page }) => {
    const colName = uniqueId('复制测试_');
    await coll.createCollection(colName);

    await rp.selectMethod('DELETE');
    await rp.setMockUrl('/delete');
    await saveDialog.save(colName);

    const deleteBadge = coll.tree.locator('.method-badge.method-DELETE');
    await expect(deleteBadge.first()).toBeVisible();

    const countBefore = await deleteBadge.count();

    await coll.rightClickRequest('DELETE');

    await expect(coll.contextMenu).toBeVisible();
    await coll.contextMenu.locator('.context-menu-item').filter({ hasText: '复制' }).click();

    await expect(coll.tree.locator('.method-badge.method-DELETE')).toHaveCount(countBefore + 1);
  });

  test('右键删除请求', async ({ page }) => {
    const colName = uniqueId('删除请求测试_');
    await coll.createCollection(colName);

    await rp.selectMethod('PATCH');
    await rp.setMockUrl('/patch');
    await saveDialog.save(colName);

    const patchBadge = coll.tree.locator('.method-badge.method-PATCH');
    await expect(patchBadge).toBeVisible();

    await coll.rightClickRequest('PATCH');

    await expect(coll.contextMenu).toBeVisible();
    await coll.contextMenu.locator('.context-menu-item').filter({ hasText: '删除' }).click();

    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible();
    await page.locator('#modal .modal-btn-danger').click();

    await expect(coll.tree.locator('.method-badge.method-PATCH')).toHaveCount(0);
  });

  test('保存时使用自定义请求名称', async ({ page }) => {
    const colName = uniqueId('自定义名称_');
    await coll.createCollection(colName);

    await rp.selectMethod('GET');
    await rp.setMockUrl('/get');

    const customName = uniqueId('我的自定义请求_');
    await saveDialog.save(colName, customName);

    await expect(coll.tree.locator('.tree-item').filter({ hasText: customName })).toBeVisible();
  });

  test('取消保存不创建请求', async ({ page }) => {
    const colName = uniqueId('取消测试_');
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');

    await saveDialog.cancel();

    const colTreeItem = coll.tree.locator('.tree-item').filter({ hasText: colName }).first();
    await expect(colTreeItem.locator('.method-badge')).toHaveCount(0);
  });

  test('保存到不同的集合', async ({ page }) => {
    const colA = uniqueId('集合AX_');
    const colB = uniqueId('集合BX_');

    await coll.createCollection(colA);
    await coll.createCollection(colB);

    await rp.setMockUrl('/get');

    await saveDialog.save(colB);

    await expect(coll.tree.locator('.method-badge').first()).toBeVisible();
  });

  test('修改已保存请求并再次保存', async ({ page }) => {
    const tabBar = new TabBar(page);
    const colName = uniqueId('更新测试_');
    await coll.createCollection(colName);

    const originalUrl = `${MOCK_BASE_URL}/post`;
    await rp.selectMethod('POST');
    await rp.setUrl(originalUrl);

    // 第一次保存
    await saveDialog.save(colName);

    await expect(coll.tree.locator('.method-badge.method-POST').first()).toBeVisible();

    // 修改请求
    const updatedUrl = `${MOCK_BASE_URL}/put`;
    await rp.selectMethod('PUT');
    await rp.setUrl(updatedUrl);

    // 第二次保存 — 直接更新（不弹 modal）
    await saveDialog.quickSave();

    await rp.setUrl('https://example.com');
    await tabBar.addTab();

    await coll.tree.locator('.method-badge.method-PUT').first().click();

    await expect(rp.urlInput).toHaveValue(updatedUrl);
    await expect(rp.methodSelect).toHaveValue('PUT');
  });

  test('加载集合请求时已有匹配标签页则切换而非新建', async ({ page }) => {
    const colName = uniqueId('去重测试_');
    await coll.createCollection(colName);

    const testUrl = `${MOCK_BASE_URL}/get`;
    await rp.setUrl(testUrl);
    await saveDialog.save(colName);

    await expect(coll.tree.locator('.method-badge.method-GET').first()).toBeVisible();
    await expect(page.locator('.request-tab')).toHaveCount(1);

    // 点击侧边栏已打开的请求 — 应切换到已有标签页而非新建
    await coll.tree.locator('.method-badge.method-GET').first().click();
    await expect(page.locator('.request-tab')).toHaveCount(1);
    await expect(rp.urlInput).toHaveValue(testUrl);
  });
});
