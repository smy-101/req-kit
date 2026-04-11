import { test, expect } from '@playwright/test';

test.describe('更新已保存请求', () => {
  test('修改已保存请求并再次保存', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `更新测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    const originalUrl = 'https://httpbin.org/post';
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(originalUrl);

    // 第一次保存 — 弹出保存对话框
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 验证请求出现在集合中
    await expect(page.locator('#collection-tree .method-badge.method-POST').first()).toBeVisible({ timeout: 5000 });

    // 修改请求（改变 URL 和方法）
    const updatedUrl = 'https://httpbin.org/put';
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(updatedUrl);
    await page.waitForTimeout(300);

    // 第二次保存 — 因为已有 requestId，应该直接更新（无对话框）
    await page.locator('#save-btn').click();
    await page.waitForTimeout(1000);

    // 修改当前 URL 以验证加载后恢复
    await page.locator('#url-input').fill('https://example.com');
    await page.waitForTimeout(200);

    // 创建新标签页避免 URL 匹配
    await page.locator('.request-tab-add').click();
    await page.waitForTimeout(300);

    // 点击集合中的 PUT badge 加载请求（因为已更新为 PUT）
    await page.locator('#collection-tree .method-badge.method-PUT').first().click();
    await page.waitForTimeout(300);

    // 验证 URL 已更新
    await expect(page.locator('#url-input')).toHaveValue(updatedUrl);
    await expect(page.locator('#method-select')).toHaveValue('PUT');
  });
});
