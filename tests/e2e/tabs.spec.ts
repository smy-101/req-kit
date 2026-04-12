import { test, expect } from './fixtures';
import { waitForModalClose } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('标签页管理', () => {
  test('默认存在一个标签页', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.request-tab')).toHaveCount(1);
    await expect(page.locator('.request-tab.active')).toBeVisible();
  });

  test('点击 + 按钮创建新标签页', async ({ page }) => {
    await page.goto('/');
    const addBtn = page.locator('.request-tab-add');
    await addBtn.click();
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('切换标签页', async ({ page }) => {
    await page.goto('/');
    await page.locator('.request-tab-add').click();
    const tabs = page.locator('.request-tab');

    await expect(tabs.nth(1)).toHaveClass(/active/);

    await tabs.first().click();
    await expect(tabs.first()).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
  });

  test('关闭标签页', async ({ page }) => {
    await page.goto('/');
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    const closeBtn = page.locator('.request-tab').nth(1).locator('.request-tab-close');
    await closeBtn.click();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });
});

test.describe('标签页高级功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('修改已保存请求后关闭标签页显示确认对话框', async ({ page }) => {
    const colName = `脏标签测试_${Date.now()}`;
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

    // 使用 type 模拟实际键盘输入以触发 dirty 状态
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially('123');
    await expect(page.locator('.request-tab-title').first()).toContainText('●');

    await page.locator('.request-tab-close').first().click();

    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-dialog-title')).toContainText('未保存的变更');

    await page.locator('#dirty-cancel').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('脏标签页关闭对话框 — 丢弃更改', async ({ page }) => {
    const colName = `脏丢弃_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially('123');
    await expect(page.locator('.request-tab-title').first()).toContainText('●');

    await page.locator('.request-tab-close').first().click();
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await page.locator('#dirty-discard').click();

    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
  });

  test('鼠标中键关闭标签页', async ({ page }) => {
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    await page.locator('.request-tab').first().click({ button: 'middle' });
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('脏标签页标题显示圆点前缀', async ({ page }) => {
    const colName = `标题前缀_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    await expect(page.locator('.request-tab-title').first()).not.toContainText('●');

    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially('123');

    await expect(page.locator('.request-tab-title').first()).toContainText('●');
  });
});
