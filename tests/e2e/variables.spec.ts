import { test, expect } from '@playwright/test';
import { sendRequestAndWait, waitForModal, waitForModalClose } from './helpers/wait';
import { MOCK_BASE_URL } from './helpers/mock';


test.describe('变量系统', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('环境变量模板替换', async ({ page }) => {

    // 创建环境并添加变量
    const envName = `模板测试_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await waitForModal(page);

    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    // 选中环境
    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    // 添加变量
    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });
    await kvEditor.locator('.kv-add-btn').click();

    const firstRow = kvEditor.locator('.kv-row').first();
    await firstRow.locator('.kv-key').fill('host');
    await firstRow.locator('.kv-value').fill('localhost:4000');

    // 保存变量
    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());
    await page.locator('#modal #close-env-modal').click();

    // 选择该环境
    await page.locator('#active-env').selectOption({ label: envName });

    // 在 URL 中使用变量
    await sendRequestAndWait(page, 'http://{{host}}/get', '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('localhost:4000');
  });

  test('全局变量管理弹窗', async ({ page }) => {

    // 打开全局变量弹窗
    await page.locator('#btn-manage-global-vars').click();

    await waitForModal(page);
    await expect(page.locator('#modal h3')).toHaveText('管理全局变量');

    // 添加全局变量（使用唯一 key 避免并发冲突）
    const uniqueKey = `gk_${Date.now()}`;
    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill(uniqueKey);
    await firstRow.locator('.kv-value').fill('global_value');

    // 保存
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 验证全局变量数量 > 0（不精确匹配，因为其他并行测试可能也添加了变量）
    await expect(page.locator('#global-var-count')).not.toHaveText('0', { timeout: 5000 });
  });

  test('全局变量在 URL 中可用', async ({ page }) => {

    // 设置全局变量（使用唯一 key）
    const uniqueKey = `api_host_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const lastRow = page.locator('#modal .kv-row').last();
    await lastRow.locator('.kv-key').fill(uniqueKey);
    await lastRow.locator('.kv-value').fill('localhost:4000');

    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 使用变量发送请求
    await sendRequestAndWait(page, `http://{{${uniqueKey}}}/get`, '200');
  });

  test('变量预览面板', async ({ page }) => {

    // 设置全局变量
    const uniqueKey = `preview_var_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill(uniqueKey);
    await firstRow.locator('.kv-value').fill('preview_value');

    await page.locator('#modal #save-global-vars').click();

    // 打开变量预览面板
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();

    // 验证变量显示
    await expect(panel).toContainText(uniqueKey);
    await expect(panel).toContainText('preview_value');
    await expect(panel).toContainText('Global');

    // 关闭面板
    await page.locator('#btn-var-preview').click();
    await expect(panel).toBeHidden();
  });

  test('变量预览搜索功能', async ({ page }) => {

    // 设置全局变量
    const uniqueKey = `search_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);

    const addBtn = page.locator('#modal .kv-add-btn');
    await addBtn.click();

    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('val1');

    await addBtn.click();
    await page.locator('#modal .kv-row').nth(1).locator('.kv-key').fill('other_var');
    await page.locator('#modal .kv-row').nth(1).locator('.kv-value').fill('val2');

    await page.locator('#modal #save-global-vars').click();

    // 打开变量预览
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();

    // 搜索
    await panel.locator('#var-search').fill('search_');
    await expect(panel).toContainText(uniqueKey);
    // other_var 不应包含 "search_"
    await expect(panel.locator('.var-preview-row').filter({ hasText: 'other_var' })).not.toBeVisible();
  });
});
