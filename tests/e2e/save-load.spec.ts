import { test, expect } from '@playwright/test';
import { waitForModalClose } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';


test.describe('保存与加载请求', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('保存请求到集合', async ({ page }) => {

    // 先创建集合
    const colName = `保存测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 设置请求信息
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);

    // 保存请求
    await page.locator('#save-btn').click();

    // 等待保存弹窗
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await expect(saveModal.locator('.confirm-dialog-title')).toHaveText('Save Request');
    await expect(saveModal.locator('#save-req-name')).toBeVisible();
    await expect(saveModal.locator('#save-col-select')).toBeVisible();

    // 选择我们创建的集合并保存
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();

    // 等待弹窗关闭
    await waitForModalClose(page);

    // 验证请求出现在集合中（方法 badge 出现）
    await expect(page.locator('#collection-tree .method-badge.method-POST').first()).toBeVisible({ timeout: 5000 });
  });

  test('从集合加载请求', async ({ page }) => {

    // 创建集合
    const colName = `加载测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 设置请求并保存
    const testUrl = `${MOCK_BASE_URL}/put`;
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(testUrl);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 等待保存完成
    await expect(page.locator('#collection-tree .method-badge.method-PUT').first()).toBeVisible({ timeout: 5000 });

    // 修改当前标签页的 URL
    await page.locator('#url-input').fill('https://example.com');

    // 点击集合中的 PUT 请求加载
    await page.locator('#collection-tree .method-badge.method-PUT').first().click();

    // 验证 URL 被恢复
    await expect(page.locator('#url-input')).toHaveValue(testUrl);
    await expect(page.locator('#method-select')).toHaveValue('PUT');
  });

  test('右键复制请求', async ({ page }) => {

    // 创建集合并保存请求
    const colName = `复制测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('DELETE');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delete`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const deleteBadge = page.locator('#collection-tree .method-badge.method-DELETE');
    await expect(deleteBadge.first()).toBeVisible({ timeout: 5000 });

    // 记录当前 DELETE badge 数量
    const countBefore = await deleteBadge.count();

    // 右键点击请求
    await deleteBadge.first().click({ button: 'right' });

    // 等待上下文菜单
    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible({ timeout: 5000 });

    // 点击复制
    await ctxMenu.locator('.context-menu-item').filter({ hasText: '复制' }).click();

    // 验证出现了多一个 DELETE 请求项
    await expect(page.locator('#collection-tree .method-badge.method-DELETE')).toHaveCount(countBefore + 1, { timeout: 5000 });
  });

  test('右键删除请求', async ({ page }) => {

    // 创建集合并保存请求
    const colName = `删除请求测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#method-select').selectOption('PATCH');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/patch`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const patchBadge = page.locator('#collection-tree .method-badge.method-PATCH');
    await expect(patchBadge).toBeVisible({ timeout: 5000 });

    // 右键点击请求
    await patchBadge.first().click({ button: 'right' });

    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible({ timeout: 5000 });

    // 点击删除
    await ctxMenu.locator('.context-menu-item').filter({ hasText: '删除' }).click();

    // 确认删除
    await expect(page.locator('#modal .modal-btn-danger')).toBeVisible({ timeout: 5000 });
    await page.locator('#modal .modal-btn-danger').click();

    // 验证请求已消失
    await expect(page.locator('#collection-tree .method-badge.method-PATCH')).toHaveCount(0, { timeout: 5000 });
  });
});
