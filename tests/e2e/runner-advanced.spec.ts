import { test, expect } from '@playwright/test';

test.describe('集合 Runner 高级功能', () => {
  test('Runner 结果展开/折叠', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `Runner展开_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible({ timeout: 5000 });
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });

    // 运行集合
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await treeItem.hover();
    await treeItem.locator('.tree-run-btn').click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible({ timeout: 5000 });

    // 等待运行完成
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    // 点击结果项展开详情
    const resultItem = page.locator('.runner-result-item').first();
    await expect(resultItem).toBeVisible({ timeout: 5000 });
    await resultItem.locator('.runner-result-summary').click();
    await page.waitForTimeout(300);

    // 验证详情区域可见
    await expect(resultItem.locator('.runner-result-detail')).toBeVisible();
    await expect(resultItem).toHaveClass(/expanded/);

    // 再次点击折叠
    await resultItem.locator('.runner-result-summary').click();
    await page.waitForTimeout(300);

    // 验证详情区域隐藏
    await expect(resultItem.locator('.runner-result-detail')).toHaveClass(/hidden/);

    // 关闭 Runner
    await page.locator('#modal .runner-close-btn').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });
  });

  test('Runner 重试配置默认值', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `Runner重试默认_${Date.now()}`;
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

    // 验证重试配置输入框存在（运行时可能已禁用）
    await expect(page.locator('#runner-retry-count')).toBeVisible();
    await expect(page.locator('#runner-retry-delay')).toBeVisible();

    // 验证默认值
    await expect(page.locator('#runner-retry-count')).toHaveValue('0');
    await expect(page.locator('#runner-retry-delay')).toHaveValue('1000');

    // 等待运行完成
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    // 关闭 Runner
    await page.locator('#modal .runner-close-btn').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });
  });

  test('Runner 停止按钮存在', async ({ page }) => {
    await page.goto('/');

    // 创建集合并保存请求
    const colName = `Runner停止_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill('https://httpbin.org/delay/5');
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

    // 验证停止按钮存在
    await expect(page.locator('#runner-stop-btn')).toBeVisible({ timeout: 5000 });

    // 等待运行完成
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    // 关闭
    await page.locator('#modal .runner-close-btn').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible({ timeout: 5000 });
  });
});
