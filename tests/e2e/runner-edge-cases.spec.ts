import { test, expect } from './fixtures';
import { uniqueId, runCollection } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { RunnerPage } from './pages/runner-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';

test.describe('Runner 边界情况', () => {
  let coll: CollectionPage;
  let runner: RunnerPage;
  let rp: RequestPage;
  let saveDialog: SaveDialogPage;

  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
    runner = new RunnerPage(page);
    rp = new RequestPage(page);
    saveDialog = new SaveDialogPage(page);
  });

  test('运行完成后可重新运行', async ({ page }) => {
    const colName = uniqueId('重新运行_');
    await coll.createCollection(colName);

    // 保存一个请求到集合
    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    // 打开 Runner 面板
    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    // 第一次运行
    await runner.run();
    await expect(runner.summary).toBeVisible({ timeout: 30000 });
    await expect(runner.summary).toContainText('通过');

    // 运行按钮应重新出现
    await expect(runner.runBtn).toBeVisible();

    // 重新运行
    await runner.run();
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 验证总结存在
    await expect(runner.summary).toContainText('通过');
  });
});
