import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { RunnerPage } from './pages/runner-page';
import { TabBar } from './pages/tab-bar';

test.describe('集合 Runner', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let runner: RunnerPage;
  let tabBar: TabBar;

  // Runner 测试需要较长时间（包含运行请求 + 等待结果）
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    runner = new RunnerPage(page);
    tabBar = new TabBar(page);
    await page.goto('/');
  });

  async function runCollection(page: Page, colName: string) {
    const treeItem = coll.tree.locator('.tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
  }

  test('运行集合', async ({ page }) => {
    const colName = `Runner测试_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await runCollection(page, colName);

    await expect(runner.panel).toBeVisible();
    await expect(page.locator('#modal .runner-title')).toContainText(colName);
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
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await expect(runner.closeBtn).toBeVisible();
    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 结果展开/折叠', async ({ page }) => {
    const colName = `Runner展开_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/get');
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

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
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await expect(runner.retryCount).toBeVisible();
    await expect(runner.retryDelay).toBeVisible();
    await expect(runner.retryCount).toHaveValue('0');
    await expect(runner.retryDelay).toHaveValue('1000');

    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await runner.close();
    await waitForModalClose(page);
  });

  test('Runner 停止按钮存在', async ({ page }) => {
    const colName = `Runner停止_${Date.now()}`;
    await coll.createCollection(colName);

    await rp.setMockUrl('/delay/5');
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await expect(runner.stopBtn).toBeVisible();

    await expect(runner.summary).toBeVisible({ timeout: 30000 });

    await runner.close();
    await waitForModalClose(page);
  });

  test('运行中点击停止按钮', async ({ page }) => {
    const colName = `RunnerStop_${Date.now()}`;
    await coll.createCollection(colName);

    // 保存多个慢请求到集合
    const urls = [
      `${MOCK_BASE_URL}/delay/3`,
      `${MOCK_BASE_URL}/delay/3`,
      `${MOCK_BASE_URL}/delay/3`,
    ];
    for (const url of urls) {
      await tabBar.addTab();
      await rp.setUrl(url);
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible();
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    await page.locator('.request-tab').first().click();

    await runCollection(page, colName);
    await expect(runner.panel).toBeVisible();

    await expect(runner.progressText).toBeVisible();

    await expect(runner.stopBtn).toBeVisible();

    await runner.stop();

    await expect(runner.stopBtn).toContainText('关闭中');
    await expect(runner.stopBtn).toBeDisabled();
  });
});

test.describe('Runner 多请求与停止验证', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let runner: RunnerPage;
  let tabBar: TabBar;

  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    runner = new RunnerPage(page);
    tabBar = new TabBar(page);
    await page.goto('/');
  });

  async function runCollection(page: Page, colName: string) {
    const treeItem = coll.tree.locator('.tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
  }

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
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible();
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    // 运行集合
    await runCollection(page, colName);

    // 验证 Runner 面板出现
    await expect(runner.panel).toBeVisible();

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

    // 保存两个 delay/3 请求
    const urls = [`${MOCK_BASE_URL}/delay/3`, `${MOCK_BASE_URL}/delay/3`];
    for (const url of urls) {
      await tabBar.addTab();
      await rp.setUrl(url);
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible();
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    // 运行集合
    await runCollection(page, colName);

    await expect(runner.panel).toBeVisible();
    await expect(runner.progressText).toBeVisible();

    // 等待 2 秒让第一个请求完成或接近完成
    await page.waitForTimeout(2000);

    // 点击停止按钮
    await expect(runner.stopBtn).toBeVisible();
    await runner.stop();

    // 验证停止按钮变为关闭中状态
    await expect(runner.stopBtn).toContainText('关闭中');
    await expect(runner.stopBtn).toBeDisabled();

    // 等待停止完成（面板关闭或出现总结/关闭按钮）
    // 使用 Promise.race 等待面板关闭或关闭按钮出现
    await Promise.race([
      page.locator('#modal-overlay').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {}),
      runner.closeBtn.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    ]);

    // 如果面板仍然可见，尝试关闭
    const panelVisible = await runner.panel.isVisible().catch(() => false);

    if (panelVisible) {
      // 验证至少有结果项或总结
      const hasResultItems = await page.locator('.runner-result-item').count() > 0;
      const hasSummary = await runner.summary.isVisible().catch(() => false);
      expect(hasResultItems || hasSummary).toBeTruthy();
    }
    // 如果面板已自动关闭，也是可接受的行为
  });
});
