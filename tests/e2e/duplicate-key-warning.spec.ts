import { test, expect } from './fixtures';
import { uniqueId } from './helpers/wait';
import { EnvironmentPage } from './pages/environment-page';

test.describe('重复变量键警告', () => {
  let envPage: EnvironmentPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    envPage = new EnvironmentPage(page);
  });

  test('修改重复键后重新保存警告消失', async ({ page }) => {
    const envName = uniqueId('DupFixEnv_');

    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);

    await envPage.addVariable('dup_key', 'value1');
    await envPage.addVariable('dup_key', 'value2');
    await envPage.saveVariables();

    // 关闭并重新打开
    await envPage.close();
    await envPage.open();
    await envPage.selectEnv(envName);

    // 验证警告出现
    await expect(envPage.kvEditor.locator('.kv-duplicate')).toHaveCount(2);

    // 将第二个 key 改为唯一值
    const lastRow = envPage.kvEditor.locator('.kv-row').last();
    await lastRow.locator('.kv-key').fill('unique_key');

    // 保存后重新渲染
    await envPage.saveVariables();
    await envPage.close();
    await envPage.open();
    await envPage.selectEnv(envName);

    // 警告应消失
    await expect(envPage.kvEditor.locator('.kv-duplicate')).toHaveCount(0);

    await envPage.close();
  });
});
