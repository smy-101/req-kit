import { test, expect } from '@playwright/test';

test.describe('集合 Runner', () => {
  test('运行集合', async ({ page }) => {
    await page.goto('/');

    // 创建集合
    const colName = `Runner测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 保存一个请求到集合
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 等待保存完成和运行按钮出现（需要 hover 才能显示）
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible({ timeout: 5000 });

    // 点击运行按钮
    await runBtn.click();

    // 验证 Runner 面板打开
    await expect(page.locator('#modal .runner-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#modal .runner-title')).toContainText(colName);
    await expect(page.locator('#modal #runner-progress-text')).toBeVisible();

    // 等待运行完成
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    // 验证结果
    const summary = page.locator('#modal #runner-summary');
    await expect(summary).toContainText('通过');
    await expect(summary).toContainText('共');
  });

  test('Runner 关闭按钮', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `Runner关闭_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 运行集合
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await treeItem.hover();
    await treeItem.locator('.tree-run-btn').click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible({ timeout: 5000 });

    // 等待运行完成
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    // 关闭
    const closeBtn = page.locator('#modal .runner-close-btn');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();
  });
});
