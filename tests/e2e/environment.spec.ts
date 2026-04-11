import { test, expect } from '@playwright/test';

test.describe('环境管理', () => {
  test('打开环境管理弹窗', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-manage-env').click();

    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('#modal h3')).toHaveText('Manage Environments');
  });

  test('创建新环境', async ({ page }) => {
    await page.goto('/');

    const envName = `测试环境_${Date.now()}`;

    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());

    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    await page.locator('#modal #close-env-modal').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();
  });

  test('环境下拉框包含新创建的环境', async ({ page }) => {
    await page.goto('/');

    const envName = `下拉测试_${Date.now()}`;

    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });
    await page.locator('#modal #close-env-modal').click();

    const options = page.locator('#active-env option');
    const texts = await options.allTextContents();
    expect(texts).toContain(envName);
  });

  test('为环境添加变量', async ({ page }) => {
    await page.goto('/');

    const envName = `变量测试_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());

    // 选中该环境（点击 .env-name 避免 action 按钮的 stopPropagation）
    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    // 等待变量编辑器加载
    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });

    // 添加变量
    await kvEditor.locator('.kv-add-btn').click();

    const firstRow = kvEditor.locator('.kv-row').first();
    await firstRow.locator('.kv-key').fill('base_url');
    await firstRow.locator('.kv-value').fill('https://httpbin.org');

    // 保存变量
    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());

    await page.locator('#modal #close-env-modal').click();
  });
});
