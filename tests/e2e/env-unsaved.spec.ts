import { test, expect } from '@playwright/test';
import { waitForToast } from './helpers/wait';


test.describe('环境未保存更改警告', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('切换环境时有未保存变量弹出确认', async ({ page }) => {

    // 打开环境管理弹窗
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });

    // 创建第一个环境
    const env1 = `环境A_${Date.now()}`;
    await page.locator('#new-env-name').fill(env1);
    await page.locator('#create-env-btn').evaluate(el => (el as HTMLButtonElement).click());
    await expect(page.locator('.env-item').filter({ hasText: env1 })).toBeVisible({ timeout: 5000 });

    // 选择环境 — 使用 JavaScript 点击确保事件触发
    await page.locator('.env-item').filter({ hasText: env1 }).evaluate(el => (el as HTMLElement).click());

    // 验证变量编辑器已渲染
    await expect(page.locator('#env-vars-editor .kv-editor')).toBeVisible({ timeout: 5000 });

    // 在变量编辑器中添加一个变量
    await page.locator('#env-vars-editor .kv-key').first().fill('key1');
    await page.locator('#env-vars-editor .kv-value').first().fill('value1');

    // 创建第二个环境
    const env2 = `环境B_${Date.now()}`;
    await page.locator('#new-env-name').fill(env2);
    await page.locator('#create-env-btn').evaluate(el => (el as HTMLButtonElement).click());
    await expect(page.locator('.env-item').filter({ hasText: env2 })).toBeVisible({ timeout: 5000 });

    // 尝试切换到第二个环境 — 应该弹出未保存确认
    await page.locator('.env-item').filter({ hasText: env2 }).evaluate(el => (el as HTMLElement).click());

    // 验证确认对话框出现
    await expect(page.locator('.confirm-dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.confirm-dialog-title')).toContainText('Unsaved Changes');

    // 使用更精确的选择器点击 Cancel
    await page.locator('.confirm-dialog .modal-btn-secondary').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();

    // 关闭弹窗
    await page.locator('#close-env-modal').click();
  });

  test('环境变量保存后切换不弹出确认', async ({ page }) => {

    // 打开环境管理弹窗
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });

    // 创建两个环境
    const env1 = `保存A_${Date.now()}`;
    const env2 = `保存B_${Date.now()}`;

    await page.locator('#new-env-name').fill(env1);
    await page.locator('#create-env-btn').evaluate(el => (el as HTMLButtonElement).click());
    await expect(page.locator('.env-item').filter({ hasText: env1 })).toBeVisible({ timeout: 5000 });

    await page.locator('#new-env-name').fill(env2);
    await page.locator('#create-env-btn').evaluate(el => (el as HTMLButtonElement).click());
    await expect(page.locator('.env-item').filter({ hasText: env2 })).toBeVisible({ timeout: 5000 });

    // 选择第一个环境
    await page.locator('.env-item').filter({ hasText: env1 }).evaluate(el => (el as HTMLElement).click());
    await expect(page.locator('#env-vars-editor .kv-editor')).toBeVisible({ timeout: 5000 });

    // 添加变量并保存
    await page.locator('#env-vars-editor .kv-key').first().fill('saved_key');
    await page.locator('#env-vars-editor .kv-value').first().fill('saved_value');
    await page.locator('#env-vars-editor .kv-save-btn').click();
    // 等待保存完成（Toast 出现确认异步操作已完成）
    await waitForToast(page, 'Variables saved');

    // 切换到第二个环境 — 不应该弹出确认
    await page.locator('.env-item').filter({ hasText: env2 }).evaluate(el => (el as HTMLElement).click());

    // 验证没有确认对话框
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();

    // 关闭弹窗
    await page.locator('#close-env-modal').click();
  });
});
