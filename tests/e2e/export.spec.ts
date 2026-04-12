import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModal, waitForModalClose } from './helpers/wait';

test.describe('导出功能', () => {
  test('导出集合为 Postman 格式', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `导出测试_${Date.now()}`;
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
    await waitForModalClose(page);

    // 打开导入/导出弹窗并切换到导出标签
    await page.locator('#btn-import').click();
    await waitForModal(page);
    await page.locator('[data-imex-tab="export"]').click();
    await expect(page.locator('#imex-export')).toBeVisible();

    // 验证导出列表中有我们的集合
    await expect(page.locator('.export-list-item').filter({ hasText: colName })).toBeVisible({ timeout: 5000 });

    // 授予剪贴板权限并点击导出按钮
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const exportItem = page.locator('.export-list-item').filter({ hasText: colName });
    await exportItem.locator('.export-col-btn').click();

    // 验证按钮文本变为 "Copied!"
    await expect(exportItem.locator('.export-col-btn')).toContainText('Copied!', { timeout: 5000 });
  });

  test('导出标签页显示空列表', async ({ page }) => {
    await page.goto('/');

    // 不创建任何集合，打开导出标签
    await page.locator('#btn-import').click();
    await waitForModal(page);
    await page.locator('[data-imex-tab="export"]').click();

    // 验证显示提示文本
    await expect(page.locator('.export-hint')).toBeVisible();
  });
});
