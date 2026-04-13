import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModal, waitForModalClose, waitForToast } from './helpers/wait';
import { EnvironmentPage } from './pages/environment-page';

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
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);

    await envPage.close();
  });

  test('环境下拉框包含新创建的环境', async ({ page }) => {
    const envName = `下拉测试_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.close();

    const options = page.locator('#active-env option');
    const texts = await options.allTextContents();
    expect(texts).toContain(envName);
  });

  test('为环境添加变量', async ({ page }) => {
    const envName = `变量测试_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);

    await envPage.addVariable('base_url', MOCK_BASE_URL);
    await envPage.saveVariables();

    await envPage.close();
  });

  test('删除环境', async ({ page }) => {
    const envName = `删除环境_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.deleteEnv(envName);

    await envPage.close();
  });

  test('切换活跃环境', async ({ page }) => {
    const envName = `活跃环境_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.close();

    await envPage.switchActiveEnv(envName);
    await envPage.switchActiveEnv('No Environment');
  });

  test('重命名环境', async ({ page }) => {
    const envName = `重命名前_${Date.now()}`;
    const newName = `重命名后_${Date.now()}`;
    const envPage = new EnvironmentPage(page);

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.renameEnv(envName, newName);

    await envPage.close();
  });
});

test.describe('环境未保存更改警告', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('切换环境时有未保存变量弹出确认', async ({ page }) => {
    const envPage = new EnvironmentPage(page);

    // 打开环境管理弹窗
    await envPage.open();

    // 创建第一个环境
    const env1 = `环境A_${Date.now()}`;
    await envPage.createEnv(env1);

    // 选择第一个环境 — 点击 env-item 触发 switchToEnv
    await envPage.selectEnv(env1);

    // 验证变量编辑器已渲染
    await expect(page.locator('#env-vars-editor .kv-editor')).toBeVisible();

    // 在变量编辑器中添加一个变量（不保存）
    await page.locator('#env-vars-editor .kv-key').first().fill('key1');
    await page.locator('#env-vars-editor .kv-value').first().fill('value1');

    // 创建第二个环境
    const env2 = `环境B_${Date.now()}`;
    await envPage.createEnv(env2);

    // 尝试切换到第二个环境 — 应该弹出未保存确认
    await page.locator('#modal .env-item').filter({ hasText: env2 }).dispatchEvent('click');

    // 验证确认对话框出现
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-dialog-title')).toContainText('Unsaved Changes');

    // 使用更精确的选择器点击 Cancel
    await page.locator('.confirm-dialog .modal-btn-secondary').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();

    // 关闭弹窗
    await page.locator('#close-env-modal').click();
  });

  test('切换环境时确认丢弃未保存变量', async ({ page }) => {
    const envPage = new EnvironmentPage(page);

    // 打开环境管理弹窗
    await envPage.open();

    // 创建两个环境
    const env1 = `丢弃A_${Date.now()}`;
    const env2 = `丢弃B_${Date.now()}`;
    await envPage.createEnv(env1);
    await envPage.createEnv(env2);

    // 选择第一个环境
    await envPage.selectEnv(env1);
    await expect(page.locator('#env-vars-editor .kv-editor')).toBeVisible();

    // 添加变量（不保存）
    await page.locator('#env-vars-editor .kv-key').first().fill('discard_key');
    await page.locator('#env-vars-editor .kv-value').first().fill('discard_value');

    // 尝试切换到第二个环境
    await page.locator('#modal .env-item').filter({ hasText: env2 }).dispatchEvent('click');

    // 验证确认对话框出现
    await expect(page.locator('.confirm-dialog')).toBeVisible();

    // 点击确认（丢弃更改）
    await page.locator('.confirm-dialog .modal-btn-primary').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();

    // 验证已切换到第二个环境
    await expect(page.locator('#env-vars-editor .kv-key').first()).not.toHaveValue('discard_key');

    // 关闭弹窗
    await page.locator('#close-env-modal').click();
  });

  test('环境变量保存后切换不弹出确认', async ({ page }) => {
    const envPage = new EnvironmentPage(page);

    // 打开环境管理弹窗
    await envPage.open();

    // 创建两个环境
    const env1 = `保存A_${Date.now()}`;
    const env2 = `保存B_${Date.now()}`;

    await envPage.createEnv(env1);

    // 选择第一个环境
    await envPage.selectEnv(env1);
    await expect(page.locator('#env-vars-editor .kv-editor')).toBeVisible();

    // 添加变量并保存
    await page.locator('#env-vars-editor .kv-key').first().fill('saved_key');
    await page.locator('#env-vars-editor .kv-value').first().fill('saved_value');
    await page.locator('#env-vars-editor .kv-save-btn').click();
    // 等待保存完成（Toast 出现确认异步操作已完成）
    await waitForToast(page, 'Variables saved');

    // 创建第二个环境
    await envPage.createEnv(env2);

    // 切换到第二个环境 — 不应该弹出确认
    await page.locator('#modal .env-item').filter({ hasText: env2 }).dispatchEvent('click');

    // 验证没有确认对话框
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();

    // 关闭弹窗
    await page.locator('#close-env-modal').click();
  });
});

test.describe('环境删除级联', () => {
  test('删除环境后变量从预览面板消失', async ({ page }) => {
    await page.goto('/');
    const envName = `级联删除_${Date.now()}`;

    const envPage = new EnvironmentPage(page);
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('cascade_key', 'cascade_value');
    await envPage.saveVariables();
    await envPage.close();

    // 激活环境
    await envPage.switchActiveEnv(envName);

    // 删除环境
    await envPage.open();
    await envPage.deleteEnv(envName);
    await envPage.close();

    // 验证环境下拉回到 No Environment
    await expect(page.locator('#active-env')).toHaveValue('');
  });
});
