import { test, expect } from '@playwright/test';


test.describe('集合管理', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('创建新集合', async ({ page }) => {
    const name = `测试集合_${Date.now()}`;
    await page.locator('#btn-new-collection').click();

    const input = page.locator('#modal .dialog-input');
    await expect(input).toBeVisible();
    await input.fill(name);

    await page.locator('#modal .modal-btn-primary').click();

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: name })).toBeVisible({ timeout: 10000 });
  });

  test('创建多个集合', async ({ page }) => {
    const ts = Date.now();

    for (const name of [`集合A_${ts}`, `集合B_${ts}`, `集合C_${ts}`]) {
      await page.locator('#btn-new-collection').click();
      await page.locator('#modal .dialog-input').fill(name);
      await page.locator('#modal .modal-btn-primary').click();
      await expect(page.locator('#collection-tree .tree-item').filter({ hasText: name })).toBeVisible({ timeout: 10000 });
    }
  });

  test('删除集合', async ({ page }) => {

    const uniqueName = `删除测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(uniqueName);
    await page.locator('#modal .modal-btn-primary').click();
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: uniqueName });
    await expect(treeItem).toBeVisible({ timeout: 10000 });

    // 右键点击集合 — 直接弹出 confirmDanger dialog
    await treeItem.first().click({ button: 'right' });

    // 确认删除
    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal .modal-btn-danger').click();

    // 验证集合已消失
    await expect(treeItem).not.toBeVisible();
  });
});
