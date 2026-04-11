import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('集合请求上下文菜单与 curl 导入', () => {
  test('右键复制请求在集合中创建副本', async ({ page }) => {
    await page.goto('/');

    // 创建集合
    const colName = `复制测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 设置 URL 并等待 debounce 保存到 tab state
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.waitForTimeout(400);

    // 保存请求到集合
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 等待侧边栏刷新，使用 data-collection-id wrapper 查找方法标签
    const colWrapper = page.locator('#collection-tree [data-collection-id]').filter({ hasText: colName }).first();
    await expect(colWrapper.locator('.method-badge').first()).toBeVisible({ timeout: 10000 });

    // 右键请求的 method-badge 触发上下文菜单
    await colWrapper.locator('.method-badge').first().click({ button: 'right' });
    const ctxMenu = page.locator('.context-menu');
    await expect(ctxMenu).toBeVisible({ timeout: 5000 });

    // 点击"复制"
    await ctxMenu.locator('.context-menu-item').filter({ hasText: '复制' }).click();
    await page.waitForTimeout(500);

    // 等待上下文菜单消失
    await expect(ctxMenu).not.toBeVisible({ timeout: 3000 });

    // 刷新后验证集合中有两个请求
    await expect(colWrapper.locator('.method-badge')).toHaveCount(2, { timeout: 5000 });
  });

  test('导入 curl 命令到指定集合', async ({ page }) => {
    await page.goto('/');

    // curl 导入会使用 collections[0]，所以不创建新集合
    // 确保至少有一个集合存在（其他并行测试可能已创建）
    // 直接导入 curl 命令

    // 打开导入弹窗
    await page.locator('#btn-import').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 选择 curl 类型并粘贴命令
    await page.locator('#import-type').selectOption('curl');
    await page.locator('#import-content').fill(`curl '${MOCK_BASE_URL}/get'`);

    // 点击导入
    await page.locator('#import-action-btn').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // 验证集合树中出现了 GET 请求（curl 导入到 collections[0]）
    await expect(page.locator('#collection-tree .method-badge.method-GET').first()).toBeVisible({ timeout: 10000 });
  });

  test('导入 POST curl 命令验证方法', async ({ page }) => {
    await page.goto('/');

    // 打开导入弹窗
    await page.locator('#btn-import').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 粘贴 POST curl
    await page.locator('#import-content').fill(`curl -X POST '${MOCK_BASE_URL}/post' -H 'Content-Type: application/json' -d '{"key":"val"}'`);

    // 点击导入
    await page.locator('#import-action-btn').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // 验证集合树中出现了 POST 请求
    await expect(page.locator('#collection-tree .method-badge.method-POST').first()).toBeVisible({ timeout: 10000 });
  });
});
