import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';

test.describe('导入导出', () => {
  test('导入/导出弹窗打开', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-import').click();

    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('#modal h3')).toHaveText('Import / Export');

    // 默认显示 Import 标签
    await expect(page.locator('#imex-import')).toBeVisible();
    await expect(page.locator('#imex-export')).toBeHidden();
  });

  test('导入/导出弹窗切换标签', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-import').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 切换到 Export 标签
    await page.locator('[data-imex-tab="export"]').click();
    await expect(page.locator('#imex-export')).toBeVisible();
    await expect(page.locator('#imex-import')).toBeHidden();

    // 切换回 Import
    await page.locator('[data-imex-tab="import"]').click();
    await expect(page.locator('#imex-import')).toBeVisible();
    await expect(page.locator('#imex-export')).toBeHidden();
  });

  test('导入 curl 命令', async ({ page }) => {
    await page.goto('/');

    // 先创建集合
    const colName = `导入测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first()).toBeVisible({ timeout: 10000 });

    // 打开导入弹窗
    await page.locator('#btn-import').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 选择 curl 类型并填入 curl 命令
    await page.locator('#import-type').selectOption('curl');
    await page.locator('#import-content').fill(`curl '${MOCK_BASE_URL}/get'`);

    // 点击 Import
    await page.locator('#import-action-btn').click();

    // 等待导入成功并弹窗关闭
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 10000 });

    // 验证集合中有请求 — method badge 出现
    await expect(page.locator('#collection-tree .method-badge').first()).toBeVisible({ timeout: 5000 });
  });

  test('导入 Postman Collection', async ({ page }) => {
    await page.goto('/');

    // 使用唯一名称避免与其他测试冲突
    const colName = `Postman_${Date.now()}`;

    // 打开导入弹窗
    await page.locator('#btn-import').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 选择 Postman 类型
    await page.locator('#import-type').selectOption('postman');

    const postmanJson = JSON.stringify({
      info: { name: colName, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Test Request',
          request: { method: 'GET', url: `${MOCK_BASE_URL}/get`, header: [{ key: 'Accept', value: 'application/json' }] },
        },
      ],
    });

    await page.locator('#import-content').fill(postmanJson);

    // 点击 Import
    await page.locator('#import-action-btn').click();

    // 等待导入成功
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 10000 });

    // 验证集合和请求出现 — 使用 .first() 避免严格模式错误
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: 'Test Request' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('关闭导入导出弹窗', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-import').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#close-imex-modal').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();
  });
});
