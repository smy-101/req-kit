import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose, runCollection } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { RunnerPage } from './pages/runner-page';
import { SaveDialogPage } from './pages/save-dialog-page';
import { TabBar } from './pages/tab-bar';

test.describe('集合 Runner', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let runner: RunnerPage;
  let tabBar: TabBar;
  let saveDialog: SaveDialogPage;

  // Runner 测试需要较长时间（包含运行请求 + 等待结果）
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    runner = new RunnerPage(page);
    tabBar = new TabBar(page);
    saveDialog = new SaveDialogPage(page);
    await page.goto('/');
  });

  test('运行集合', async ({ page }) => {
    const colName = `Runner测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();
    await expect(page.locator('#modal .runner-title')).toContainText(colName);

    // 点击运行按钮
    await runner.run();

    await expect(runner.progressText).toBeVisible();

    // 等待运行完成
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await expect(runner.summary).toContainText('通过');
    await expect(runner.summary).toContainText('共');
  });

  test('Runner 关闭按钮', async ({ page }) => {
    const colName = `Runner关闭_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await runner.run();
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await expect(runner.closeBtn).toBeVisible();
    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 结果展开/折叠', async ({ page }) => {
    const colName = `Runner展开_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await runner.run();
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    const resultItem = page.locator('.runner-result-item').first();
    await expect(resultItem).toBeVisible();
    await resultItem.locator('.runner-result-summary').click();

    await expect(resultItem.locator('.runner-result-detail')).toBeVisible();
    await expect(resultItem).toHaveClass(/expanded/);

    await resultItem.locator('.runner-result-summary').click();
    await expect(resultItem.locator('.runner-result-detail')).toHaveClass(/hidden/);

    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 重试配置默认值', async ({ page }) => {
    const colName = `Runner重试默认_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await expect(runner.retryCount).toBeVisible();
    await expect(runner.retryDelay).toBeVisible();
    await expect(runner.retryCount).toHaveValue('0');
    await expect(runner.retryDelay).toHaveValue('1000');

    await runner.run();
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 停止按钮在运行中出现', async ({ page }) => {
    const colName = `Runner停止_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/delay/5');
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    // 点击运行，然后立即检查停止按钮
    await runner.run();
    await expect(runner.stopBtn).toBeVisible();

    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await runner.close();
    await waitForModalClose(page);
  });

  test('运行中点击停止按钮', async ({ page }) => {
    const colName = `RunnerStop_${Date.now()}`;
    await coll.createCollection(colName);

    // 保存多个慢请求到集合（使用 /delay/5 确保请求在停止前仍在运行）
    const urls = [
      `${MOCK_BASE_URL}/delay/5`,
      `${MOCK_BASE_URL}/delay/5`,
      `${MOCK_BASE_URL}/delay/5`,
    ];
    for (const url of urls) {
      await tabBar.addTab();
      await rp.setUrl(url);
      await saveDialog.save(colName);
    }

    await tabBar.switchToTab(0);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await runner.run();

    // 等待停止按钮出现（表示运行已开始）
    await expect(runner.stopBtn).toBeVisible();

    // 点击停止并等待停止状态
    await runner.stop();
    await expect(runner.stopBtn).toBeDisabled();
  });
});

test.describe('Runner 多请求与停止验证', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let runner: RunnerPage;
  let tabBar: TabBar;
  let saveDialog: SaveDialogPage;

  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    runner = new RunnerPage(page);
    tabBar = new TabBar(page);
    saveDialog = new SaveDialogPage(page);
    await page.goto('/');
  });

  test('Runner 多请求集合运行', async ({ page }) => {
    const colName = `RunnerMulti_${Date.now()}`;

    // 创建集合
    await coll.createCollection(colName);

    // 保存两个不同的请求到集合
    const requests = [
      { url: `${MOCK_BASE_URL}/get`, name: 'GET请求' },
      { url: `${MOCK_BASE_URL}/post`, name: 'POST请求' },
    ];
    for (const req of requests) {
      await tabBar.addTab();
      await rp.setUrl(req.url);
      if (req.url.endsWith('/post')) {
        await rp.switchTab('body');
        await rp.selectBodyType('json');
        await rp.fillBody('{"test":"runner"}');
      }
      await saveDialog.save(colName);
    }

    // 运行集合
    await runCollection(page, colName);

    // 验证 Runner 面板出现
    await expect(runner.panel).toBeVisible();

    await runner.run();

    // 验证结果数量达到 2
    await expect(page.locator('.runner-result-item')).toHaveCount(2, { timeout: 30000 });

    // 等待运行完成并验证总结
    await expect(runner.summary).toBeVisible({ timeout: 30000 });
    await expect(runner.summary).toContainText('共');

    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 停止后已完成请求保留结果', async ({ page }) => {
    const colName = `RunnerStopRes_${Date.now()}`;

    // 创建集合
    await coll.createCollection(colName);

    // 保存两个 delay/5 请求（使用较长延迟确保请求在点击停止时仍在运行）
    const urls = [`${MOCK_BASE_URL}/delay/5`, `${MOCK_BASE_URL}/delay/5`];
    for (const url of urls) {
      await tabBar.addTab();
      await rp.setUrl(url);
      await saveDialog.save(colName);
    }

    // 运行集合
    await runCollection(page, colName);

    await expect(runner.panel).toBeVisible();

    await runner.run();

    // 等待停止按钮出现（表示运行已开始）
    await expect(runner.stopBtn).toBeVisible();

    // 点击停止
    await runner.stop();

    // 验证已完成的请求结果被保留（停止前已完成的请求项仍可见）
    await expect(page.locator('.runner-result-item').first()).toBeVisible();
  });

  test('Runner 重试 — 全部失败（网络错误）', async ({ page }) => {
    const colName = `Runner重试失败_${Date.now()}`;
    await coll.createCollection(colName);

    // 使用不可达 URL 触发网络错误（retryable）
    await rp.setUrl('http://this-host-does-not-exist-12345.invalid/get');
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    // 设置重试（运行前配置）
    await runner.setRetry('2');
    await runner.setRetryDelay('500');

    // 点击运行
    await runner.run();

    // 等待运行完成
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 验证结果为失败（网络错误导致失败）
    await expect(runner.summary).toContainText('失败');

    // 验证重试徽章出现
    const retryBadge = page.locator('.runner-retry-badge').first();
    await expect(retryBadge).toBeVisible();
  });

  test('Runner 重试 — 间歇性失败后成功', async ({ page }) => {
    const colName = `Runner重试成功_${Date.now()}`;
    await coll.createCollection(colName);

    // flaky 端点：前 2 次返回 500，第 3 次返回 200
    const flakyUrl = `${MOCK_BASE_URL}/flaky?fail_count=2`;
    await rp.setUrl(flakyUrl);
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    // 设置重试 2 次
    await runner.setRetry('2');
    await runner.setRetryDelay('500');

    // 点击运行
    await runner.run();

    // 等待运行完成
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 验证结果为通过
    await expect(runner.summary).toContainText('通过');
  });

  test('Runner 重试 — 4xx 不触发重试', async ({ page }) => {
    const colName = `Runner4xx不重试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setUrl(`${MOCK_BASE_URL}/status/404`);
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    // 设置重试
    await runner.setRetry('2');

    // 点击运行
    await runner.run();

    // 等待运行完成
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 4xx 不应触发重试，不应出现重试徽章
    const retryBadge = page.locator('.runner-retry-badge').first();
    await expect(retryBadge).not.toBeVisible();
  });

  test('Runner 运行中配置不可修改', async ({ page }) => {
    const colName = `Runner配置禁用_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setUrl(`${MOCK_BASE_URL}/delay/3`);
    await saveDialog.save(colName);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    // 运行前配置应该可编辑
    await expect(runner.retryCount).toBeEnabled();
    await expect(runner.retryDelay).toBeEnabled();

    // 点击运行
    await runner.run();

    // 运行中验证配置输入框被禁用
    await expect(runner.retryCount).toBeDisabled();
    await expect(runner.retryDelay).toBeDisabled();

    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 运行完成后配置应恢复可编辑
    await expect(runner.retryCount).toBeEnabled();
    await expect(runner.retryDelay).toBeEnabled();

    await runner.close();
    await waitForModalClose(page);
  });
});

test.describe('Runner 断言与结果展示', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let runner: RunnerPage;
  let tabBar: TabBar;
  let saveDialog: SaveDialogPage;

  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    runner = new RunnerPage(page);
    tabBar = new TabBar(page);
    saveDialog = new SaveDialogPage(page);
    await page.goto('/');
  });

  test('Runner 含断言的请求显示测试结果', async ({ page }) => {
    const colName = `Runner断言_${Date.now()}`;
    await coll.createCollection(colName);

    // 配置请求并添加 post-response test
    await rp.setMockUrl('/get');
    await rp.switchTab('tests');
    await page.locator('#post-script-textarea').fill('tests["Status is 200"] = response.status === 200;');

    await saveDialog.save(colName);

    // 运行集合
    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await runner.run();

    // 等待运行完成
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 展开结果查看断言
    const resultItem = page.locator('.runner-result-item').first();
    await resultItem.locator('.runner-result-summary').click();
    await expect(resultItem.locator('.runner-assertion')).toBeVisible();
    await expect(resultItem.locator('.runner-assertion.pass')).toContainText('Status is 200');

    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 断言失败的请求显示失败状态', async ({ page }) => {
    const colName = `Runner断言失败_${Date.now()}`;
    await coll.createCollection(colName);

    // 配置请求并添加会失败的 post-response test
    await rp.setMockUrl('/get');
    await rp.switchTab('tests');
    await page.locator('#post-script-textarea').fill('tests["Should be 404"] = response.status === 404;');

    await saveDialog.save(colName);

    // 运行集合
    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await runner.run();

    // 等待运行完成
    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    // 验证结果包含失败
    await expect(runner.summary).toContainText('失败');

    // 展开结果查看断言
    const resultItem = page.locator('.runner-result-item').first();
    await resultItem.locator('.runner-result-summary').click();
    await expect(resultItem.locator('.runner-assertion.fail')).toBeVisible();
    await expect(resultItem.locator('.runner-assertion.fail')).toContainText('Should be 404');

    await runner.close();
    await waitForModalClose(page);
  });
});
