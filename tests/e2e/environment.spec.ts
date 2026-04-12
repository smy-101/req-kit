import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModal, waitForModalClose } from './helpers/wait';

test.describe('环境管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('打开环境管理弹窗', async ({ page }) => {
    await page.locator('#btn-manage-env').click();

    await waitForModal(page);
    await expect(page.locator('#modal h3')).toHaveText('Manage Environments');
  });

  test('创建新环境', async ({ page }) => {
    const envName = `测试环境_${Date.now()}`;

    await page.locator('#btn-manage-env').click();
    await waitForModal(page);

    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());

    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    await page.locator('#modal #close-env-modal').click();
    await waitForModalClose(page);
  });

  test('环境下拉框包含新创建的环境', async ({ page }) => {
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
    const envName = `变量测试_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());

    // 选中该环境
    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    // 等待变量编辑器加载
    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible();

    // 添加变量
    await kvEditor.locator('.kv-add-btn').click();

    const firstRow = kvEditor.locator('.kv-row').first();
    await firstRow.locator('.kv-key').fill('base_url');
    await firstRow.locator('.kv-value').fill(MOCK_BASE_URL);

    // 保存变量
    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());

    await page.locator('#modal #close-env-modal').click();
  });

  test('删除环境', async ({ page }) => {
    const envName = `删除环境_${Date.now()}`;

    await page.locator('#btn-manage-env').click();
    await waitForModal(page);
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    const envItem = page.locator('#modal .env-item').filter({ hasText: envName });
    await envItem.locator('.env-item-actions .btn-danger-text').click();

    await expect(envItem.locator('.env-delete-msg')).toBeVisible();
    await envItem.locator('.modal-btn-danger').click();

    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).not.toBeVisible();

    await page.locator('#modal #close-env-modal').click();
  });

  test('切换活跃环境', async ({ page }) => {
    const envName = `活跃环境_${Date.now()}`;

    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });
    await page.locator('#modal #close-env-modal').click();

    await page.locator('#active-env').selectOption({ label: envName });
    await page.locator('#active-env').selectOption({ label: 'No Environment' });
  });

  test('重命名环境', async ({ page }) => {
    const envName = `重命名前_${Date.now()}`;
    const newName = `重命名后_${Date.now()}`;

    await page.locator('#btn-manage-env').click();
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    const envItem = page.locator('#modal .env-item').filter({ hasText: envName });
    await envItem.locator('.env-action-btn').first().click();

    const renameInput = page.locator('#modal .env-rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill(newName);
    await renameInput.press('Enter');

    await expect(page.locator('#modal .env-item').filter({ hasText: newName })).toBeVisible();

    await page.locator('#modal #close-env-modal').click();
  });
});
