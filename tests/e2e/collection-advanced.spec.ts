import { test, expect } from '@playwright/test';
import { waitForModalClose } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';


test.describe('集合高级功能', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('右键集合只显示删除选项', async ({ page }) => {

    // 创建集合
    const colName = `右键菜单_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 右键点击集合 — 应弹出确认删除对话框（不是上下文菜单）
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await treeItem.click({ button: 'right' });

    // 验证弹出确认删除对话框
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#modal .confirm-dialog-title')).toContainText('Delete Collection');

    // 取消删除
    await page.locator('#modal .modal-btn-secondary').click();
    await waitForModalClose(page);

    // 验证集合仍然存在
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible();
  });

  test('创建多个集合后每个都可以独立操作', async ({ page }) => {

    // 创建 3 个集合
    const names = [`集合A_${Date.now()}`, `集合B_${Date.now()}`, `集合C_${Date.now()}`];
    for (const name of names) {
      await page.locator('#btn-new-collection').click();
      await page.locator('#modal .dialog-input').fill(name);
      await page.locator('#modal .modal-btn-primary').click();
    }

    // 验证 3 个集合都存在
    for (const name of names) {
      await expect(page.locator('#collection-tree .tree-item').filter({ hasText: name })).toBeVisible({ timeout: 5000 });
    }

    // 删除第二个集合
    const colB = page.locator('#collection-tree .tree-item').filter({ hasText: names[1] }).first();
    await colB.click({ button: 'right' });
    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal .modal-btn-danger').click();

    // 验证 B 已删除，A 和 C 仍存在
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: names[1] })).toHaveCount(0);
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: names[0] })).toBeVisible();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: names[2] })).toBeVisible();
  });

  test('集合中的请求右键显示复制和删除选项', async ({ page }) => {

    // 创建集合并保存请求
    const colName = `请求右键_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    // 右键点击请求项
    await page.locator('#collection-tree .method-badge').first().click({ button: 'right' });

    // 验证上下文菜单有两个选项
    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible({ timeout: 5000 });
    await expect(ctxMenu.locator('.context-menu-item')).toHaveCount(2);
    await expect(ctxMenu.locator('.context-menu-item').filter({ hasText: '复制' })).toBeVisible();
    await expect(ctxMenu.locator('.context-menu-item').filter({ hasText: '删除' })).toBeVisible();
  });
});
