import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('标签页高级功能', () => {
  test('修改已保存请求后关闭标签页显示确认对话框', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `脏标签测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 使用 type 模拟实际键盘输入以触发 dirty 状态
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially('123');
    await page.waitForTimeout(500);

    // 关闭标签页应该触发确认对话框
    await page.locator('.request-tab-close').first().click();

    // 验证确认对话框出现（标题为中文）
    await expect(page.locator('.confirm-dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.confirm-dialog-title')).toContainText('未保存的变更');

    // 点击取消，标签页应该保持
    await page.locator('#dirty-cancel').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('脏标签页关闭对话框 — 丢弃更改', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `脏丢弃_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 修改 URL（使用 type 触发 dirty）
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially('123');
    await page.waitForTimeout(500);

    // 关闭标签页并选择丢弃
    await page.locator('.request-tab-close').first().click();
    await expect(page.locator('.confirm-dialog')).toBeVisible({ timeout: 5000 });
    await page.locator('#dirty-discard').click();

    // 标签页应该被关闭（但至少有一个默认标签页）
    await expect(page.locator('.confirm-dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('鼠标中键关闭标签页', async ({ page }) => {
    await page.goto('/');

    // 创建第二个标签页
    await page.locator('.request-tab-add').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // 鼠标中键点击关闭第一个标签页
    await page.locator('.request-tab').first().click({ button: 'middle' });
    await page.waitForTimeout(300);

    // 验证只剩一个标签页
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });

  test('脏标签页标题显示圆点前缀', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `标题前缀_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 保存后标签标题不应有圆点
    await expect(page.locator('.request-tab-title').first()).not.toContainText('●');

    // 修改 URL 使标签变脏
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially('123');
    await page.waitForTimeout(500);

    // 标签标题应该显示圆点前缀
    await expect(page.locator('.request-tab-title').first()).toContainText('●');
  });
});
