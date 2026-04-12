import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose } from './helpers/wait';


test.describe('更新已保存请求', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('修改已保存请求并再次保存', async ({ page }) => {

    // 创建集合并保存请求
    const colName = `更新测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    const originalUrl = `${MOCK_BASE_URL}/post`;
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(originalUrl);

    // 第一次保存 — 弹出保存对话框
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 验证请求出现在集合中
    await expect(page.locator('#collection-tree .method-badge.method-POST').first()).toBeVisible({ timeout: 5000 });

    // 修改请求（改变 URL 和方法）
    const updatedUrl = `${MOCK_BASE_URL}/put`;
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(updatedUrl);

    // 第二次保存 — 因为已有 requestId，应该直接更新（无对话框）
    await page.locator('#save-btn').click();

    // 修改当前 URL 以验证加载后恢复
    await page.locator('#url-input').fill('https://example.com');

    // 创建新标签页避免 URL 匹配
    await page.locator('.request-tab-add').click();

    // 点击集合中的 PUT badge 加载请求（因为已更新为 PUT）
    await page.locator('#collection-tree .method-badge.method-PUT').first().click();

    // 验证 URL 已更新
    await expect(page.locator('#url-input')).toHaveValue(updatedUrl);
    await expect(page.locator('#method-select')).toHaveValue('PUT');
  });
});
