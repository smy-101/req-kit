import { test, expect } from '@playwright/test';

test.describe('集合变量', () => {
  test('集合变量按钮存在', async ({ page }) => {
    await page.goto('/');

    // 创建集合
    const colName = `变量集合_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 验证变量按钮出现
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName });
    await expect(treeItem.locator('.coll-var-btn')).toBeVisible({ timeout: 5000 });
  });

  test('打开集合变量编辑器', async ({ page }) => {
    await page.goto('/');

    const colName = `变量编辑_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 点击变量按钮
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName });
    await treeItem.locator('.coll-var-btn').click({ timeout: 5000 });

    // 验证弹窗打开
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('#modal h3')).toContainText(colName);
    await expect(page.locator('#modal #coll-var-editor')).toBeVisible();

    // 关闭弹窗
    await page.locator('#modal #close-coll-var-modal').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();
  });

  test('添加并保存集合变量', async ({ page }) => {
    await page.goto('/');

    const colName = `保存变量_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 打开变量编辑器
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName });
    await treeItem.locator('.coll-var-btn').click({ timeout: 5000 });
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 添加变量
    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill('coll_host');
    await firstRow.locator('.kv-value').fill('httpbin.org');

    // 保存
    await page.locator('#modal #save-coll-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();

    // 验证变量指示器出现
    await expect(treeItem.locator('.coll-var-indicator')).toBeVisible({ timeout: 5000 });
  });
});
