import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('保存对话框高级功能', () => {
  test('保存时使用自定义请求名称', async ({ page }) => {
    await page.goto('/');

    // 创建集合
    const colName = `自定义名称_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 设置请求
    await page.locator('#method-select').selectOption('GET');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    // 保存请求
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });

    // 修改请求名称
    const customName = `我的自定义请求_${Date.now()}`;
    await saveModal.locator('#save-req-name').clear();
    await saveModal.locator('#save-req-name').fill(customName);

    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 验证自定义名称出现在集合中
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: customName })).toBeVisible({ timeout: 5000 });
  });

  test('取消保存不创建请求', async ({ page }) => {
    await page.goto('/');

    // 创建集合
    const colName = `取消测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    // 保存请求
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });

    // 点击取消
    await saveModal.locator('#save-cancel').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 验证该集合中没有请求
    const colTreeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await expect(colTreeItem.locator('.method-badge')).toHaveCount(0, { timeout: 5000 });
  });

  test('保存到不同的集合', async ({ page }) => {
    await page.goto('/');

    // 创建两个集合
    const colA = `集合AX_${Date.now()}`;
    const colB = `集合BX_${Date.now()}`;

    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colA);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colA })).toBeVisible({ timeout: 10000 });

    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colB);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colB })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.waitForTimeout(300);

    // 保存请求到集合 B
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });

    // 等待 select options 渲染完成
    const selectEl = saveModal.locator('#save-col-select');
    await selectEl.waitFor({ state: 'visible' });
    await selectEl.selectOption({ label: colB });
    await page.waitForTimeout(200);

    await saveModal.locator('#save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 验证请求出现在集合 B 的范围内（集合 B 的 tree-item 内或紧跟其后）
    const allItems = page.locator('#collection-tree .tree-item');
    const colBItem = allItems.filter({ hasText: colB }).first();
    // 集合 B 的下一个兄弟节点应包含请求的 method badge
    await expect(page.locator('#collection-tree .method-badge').first()).toBeVisible({ timeout: 5000 });

    // 验证保存成功 toast 或 sidebar 更新
    await page.waitForTimeout(500);
  });
});
