import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose } from './helpers/wait';


test.describe('Runner 停止执行', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('运行中点击停止按钮', async ({ page }) => {

    // 创建集合
    const colName = `RunnerStop_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 保存多个慢请求到集合
    const urls = [
      `${MOCK_BASE_URL}/delay/3`,
      `${MOCK_BASE_URL}/delay/3`,
      `${MOCK_BASE_URL}/delay/3`,
    ];
    for (const url of urls) {
      await page.locator('.request-tab-add').click();
      await page.locator('#url-input').fill(url);
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible({ timeout: 5000 });
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    // 切回第一个标签页
    await page.locator('.request-tab').first().click();

    // 运行集合
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    await treeItem.hover();
    await treeItem.locator('.tree-run-btn').click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible({ timeout: 5000 });

    // 等待运行开始（进度条出现）
    await expect(page.locator('#modal #runner-progress-text')).toBeVisible({ timeout: 5000 });

    // 验证停止按钮存在
    const stopBtn = page.locator('#modal #runner-stop-btn');
    await expect(stopBtn).toBeVisible({ timeout: 5000 });

    // 点击停止按钮
    await stopBtn.click();

    // 验证按钮变为"关闭中..."状态
    await expect(stopBtn).toContainText('关闭中', { timeout: 3000 });
    await expect(stopBtn).toBeDisabled();
  });
});
