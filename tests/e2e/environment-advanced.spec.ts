import { test, expect } from '@playwright/test';
import { waitForModal } from './helpers/wait';


test.describe('环境管理高级功能', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('删除环境', async ({ page }) => {

    const envName = `删除环境_${Date.now()}`;

    // 创建环境
    await page.locator('#btn-manage-env').click();
    await waitForModal(page);
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    // 点击 Delete 按钮（env-item-actions 中的按钮）
    const envItem = page.locator('#modal .env-item').filter({ hasText: envName });
    await envItem.locator('.env-item-actions .btn-danger-text').click({ timeout: 5000 });

    // 确认删除（内联的 Yes 按钮）
    await expect(envItem.locator('.env-delete-msg')).toBeVisible({ timeout: 5000 });
    await envItem.locator('.modal-btn-danger').click();

    // 验证环境已消失
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).not.toBeVisible({ timeout: 5000 });

    await page.locator('#modal #close-env-modal').click();
  });

  test('切换活跃环境', async ({ page }) => {

    const envName = `活跃环境_${Date.now()}`;

    // 创建环境
    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });
    await page.locator('#modal #close-env-modal').click();

    // 从下拉框选择（select 的 value 是 env ID，用 label 匹配）
    await page.locator('#active-env').selectOption({ label: envName });

    // 切换回 No Environment
    await page.locator('#active-env').selectOption({ label: 'No Environment' });
  });

  test('重命名环境', async ({ page }) => {

    const envName = `重命名前_${Date.now()}`;
    const newName = `重命名后_${Date.now()}`;

    // 创建环境
    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    // 点击 Rename 按钮
    const envItem = page.locator('#modal .env-item').filter({ hasText: envName });
    // 第一个 env-action-btn 是 Rename
    await envItem.locator('.env-action-btn').first().click({ timeout: 5000 });

    // 弹出重命名输入框
    const renameInput = page.locator('#modal .env-rename-input');
    await expect(renameInput).toBeVisible({ timeout: 5000 });
    await renameInput.fill(newName);
    await renameInput.press('Enter');

    // 验证新名称
    await expect(page.locator('#modal .env-item').filter({ hasText: newName })).toBeVisible({ timeout: 5000 });

    await page.locator('#modal #close-env-modal').click();
  });
});
