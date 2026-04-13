import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose, uniqueId } from './helpers/wait';
import { TabBar } from './pages/tab-bar';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';

test.describe('标签页管理', () => {
  let tabBar: TabBar;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    tabBar = new TabBar(page);
  });

  test('默认存在一个标签页', async ({ page }) => {
    await expect(page.locator('.request-tab')).toHaveCount(1);
    await expect(page.locator('.request-tab.active')).toBeVisible();
  });

  test('点击 + 按钮创建新标签页', async ({ page }) => {
    await tabBar.addTab();
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('切换标签页', async ({ page }) => {
    await tabBar.addTab();
    const tabs = page.locator('.request-tab');

    await expect(tabs.nth(1)).toHaveClass(/active/);

    await tabs.first().click();
    await expect(tabs.first()).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
  });

  test('关闭标签页', async ({ page }) => {
    await tabBar.addTab();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    await tabBar.closeTab(1);
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });
});

test.describe('标签页高级功能', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let tabBar: TabBar;
  let saveDialog: SaveDialogPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    tabBar = new TabBar(page);
    saveDialog = new SaveDialogPage(page);
  });

  test('修改已保存请求后关闭标签页显示确认对话框', async ({ page }) => {
    const colName = uniqueId('脏标签测试_');
    await coll.createCollection(colName);

    await rp.selectMethod('POST');
    await rp.setMockUrl('/post');
    await saveDialog.save(colName);

    // 使用 type 模拟实际键盘输入以触发 dirty 状态
    await rp.urlInput.click();
    await rp.urlInput.pressSequentially('123');
    await expect(page.locator('.request-tab-title').first()).toContainText('●');

    await page.locator('.request-tab-close').first().click();

    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-dialog-title')).toContainText('未保存的变更');

    await page.locator('#dirty-cancel').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('脏标签页关闭对话框 — 丢弃更改', async ({ page }) => {
    const colName = uniqueId('脏丢弃_');
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    await rp.urlInput.click();
    await rp.urlInput.pressSequentially('123');
    await expect(page.locator('.request-tab-title').first()).toContainText('●');

    await page.locator('.request-tab-close').first().click();
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await page.locator('#dirty-discard').click();

    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
  });

  test('脏标签页关闭对话框 — 保存更改并关闭', async ({ page }) => {
    const colName = uniqueId('脏保存_');
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    // 修改请求使其变为脏状态
    await rp.urlInput.click();
    await rp.urlInput.pressSequentially('123');
    await expect(page.locator('.request-tab-title').first()).toContainText('●');

    await page.locator('.request-tab-close').first().click();
    await expect(page.locator('.confirm-dialog')).toBeVisible();

    // 点击"保存"按钮 — 应触发快速保存并关闭标签页
    await page.locator('#dirty-save').click();

    // 对话框关闭，标签页被关闭
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('鼠标中键关闭标签页', async ({ page }) => {
    await tabBar.addTab();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    await page.locator('.request-tab').first().click({ button: 'middle' });
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('中键关闭脏标签页显示确认对话框', async ({ page }) => {
    const colName = uniqueId('中键脏_');
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    // 修改请求使其变为脏状态
    await rp.urlInput.click();
    await rp.urlInput.pressSequentially('xyz');
    await expect(page.locator('.request-tab-title').first()).toContainText('●');

    // 中键点击脏标签页
    await page.locator('.request-tab').first().click({ button: 'middle' });

    // 应弹出未保存确认对话框
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-dialog-title')).toContainText('未保存的变更');

    // 点击取消后标签页仍存在
    await page.locator('#dirty-cancel').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('脏标签页标题显示圆点前缀', async ({ page }) => {
    const colName = uniqueId('标题前缀_');
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    await expect(page.locator('.request-tab-title').first()).not.toContainText('●');

    await rp.urlInput.click();
    await rp.urlInput.pressSequentially('123');

    await expect(page.locator('.request-tab-title').first()).toContainText('●');
  });
});
