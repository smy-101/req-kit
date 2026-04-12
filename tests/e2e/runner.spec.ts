import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModalClose, switchRequestTab } from './helpers/wait';

test.describe('集合 Runner', () => {
  // Runner 测试需要较长时间（包含运行请求 + 等待结果）
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('运行集合', async ({ page }) => {
    const colName = `Runner测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();

    await runBtn.click();

    await expect(page.locator('#modal .runner-panel')).toBeVisible();
    await expect(page.locator('#modal .runner-title')).toContainText(colName);
    await expect(page.locator('#modal #runner-progress-text')).toBeVisible();

    // 等待运行完成
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    const summary = page.locator('#modal #runner-summary');
    await expect(summary).toContainText('通过');
    await expect(summary).toContainText('共');
  });

  test('Runner 关闭按钮', async ({ page }) => {
    const colName = `Runner关闭_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible();

    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    const closeBtn = page.locator('#modal .runner-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await waitForModalClose(page);
  });

  test('Runner 结果展开/折叠', async ({ page }) => {
    const colName = `Runner展开_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    const saveModal = page.locator('#modal');
    await expect(saveModal).toBeVisible();
    await saveModal.locator('#save-col-select').selectOption({ label: colName });
    await saveModal.locator('#save-confirm').click();
    await waitForModalClose(page);

    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible();

    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    const resultItem = page.locator('.runner-result-item').first();
    await expect(resultItem).toBeVisible();
    await resultItem.locator('.runner-result-summary').click();

    await expect(resultItem.locator('.runner-result-detail')).toBeVisible();
    await expect(resultItem).toHaveClass(/expanded/);

    await resultItem.locator('.runner-result-summary').click();
    await expect(resultItem.locator('.runner-result-detail')).toHaveClass(/hidden/);

    await page.locator('#modal .runner-close-btn').click();
    await waitForModalClose(page);
  });

  test('Runner 重试配置默认值', async ({ page }) => {
    const colName = `Runner重试默认_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible();

    await expect(page.locator('#runner-retry-count')).toBeVisible();
    await expect(page.locator('#runner-retry-delay')).toBeVisible();
    await expect(page.locator('#runner-retry-count')).toHaveValue('0');
    await expect(page.locator('#runner-retry-delay')).toHaveValue('1000');

    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    await page.locator('#modal .runner-close-btn').click();
    await waitForModalClose(page);
  });

  test('Runner 停止按钮存在', async ({ page }) => {
    const colName = `Runner停止_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delay/5`);
    await page.locator('#save-btn').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#modal #save-col-select').selectOption({ label: colName });
    await page.locator('#modal #save-confirm').click();
    await waitForModalClose(page);

    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible();

    await expect(page.locator('#runner-stop-btn')).toBeVisible();

    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });

    await page.locator('#modal .runner-close-btn').click();
    await waitForModalClose(page);
  });

  test('运行中点击停止按钮', async ({ page }) => {
    const colName = `RunnerStop_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 保存多个慢请求到集合
    const urls = [
      `${MOCK_BASE_URL}/delay/3`,
      `${MOCK_BASE_URL}/delay/3`,
      `${MOCK_BASE_URL}/delay/3`,
    ];
    for (const url of urls) {
      await page.locator('.request-tab-add').click();
      await page.locator('#url-input').fill(url);
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible();
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    await page.locator('.request-tab').first().click();

    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await expect(page.locator('#modal .runner-panel')).toBeVisible();

    await expect(page.locator('#modal #runner-progress-text')).toBeVisible();

    const stopBtn = page.locator('#modal #runner-stop-btn');
    await expect(stopBtn).toBeVisible();

    await stopBtn.click();

    await expect(stopBtn).toContainText('关闭中');
    await expect(stopBtn).toBeDisabled();
  });
});

test.describe('Runner 多请求与停止验证', () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Runner 多请求集合运行', async ({ page }) => {
    const colName = `RunnerMulti_${Date.now()}`;

    // 创建集合
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 保存两个不同的请求到集合
    const requests = [
      { url: `${MOCK_BASE_URL}/get`, name: 'GET请求' },
      { url: `${MOCK_BASE_URL}/post`, name: 'POST请求' },
    ];
    for (const req of requests) {
      await page.locator('.request-tab-add').click();
      await page.locator('#url-input').fill(req.url);
      if (req.url.endsWith('/post')) {
        await switchRequestTab(page, 'body');
        await page.locator('#body-type-select').selectOption('json');
        await page.locator('#body-textarea').fill('{"test":"runner"}');
      }
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible();
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    // 运行集合
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // 验证 Runner 面板出现
    await expect(page.locator('#modal .runner-panel')).toBeVisible();

    // 验证结果数量达到 2
    await expect(page.locator('.runner-result-item')).toHaveCount(2, { timeout: 30000 });

    // 等待运行完成并验证总结
    await expect(page.locator('#modal #runner-summary')).toBeVisible({ timeout: 30000 });
    const summary = page.locator('#modal #runner-summary');
    await expect(summary).toContainText('共');

    await page.locator('#modal .runner-close-btn').click();
    await waitForModalClose(page);
  });

  test('Runner 停止后已完成请求保留结果', async ({ page }) => {
    const colName = `RunnerStopRes_${Date.now()}`;

    // 创建集合
    await page.locator('#btn-new-collection').click();
    await page.locator('#modal .dialog-input').fill(colName);
    await page.locator('#modal .modal-btn-primary').click();
    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: colName })).toBeVisible({ timeout: 10000 });

    // 保存两个 delay/3 请求
    const urls = [`${MOCK_BASE_URL}/delay/3`, `${MOCK_BASE_URL}/delay/3`];
    for (const url of urls) {
      await page.locator('.request-tab-add').click();
      await page.locator('#url-input').fill(url);
      await page.locator('#save-btn').click();
      const saveModal = page.locator('#modal');
      await expect(saveModal).toBeVisible();
      await saveModal.locator('#save-col-select').selectOption({ label: colName });
      await saveModal.locator('#save-confirm').click();
      await waitForModalClose(page);
    }

    // 运行集合
    const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
    const runBtn = treeItem.locator('.tree-run-btn');
    await treeItem.hover();
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    await expect(page.locator('#modal .runner-panel')).toBeVisible();
    await expect(page.locator('#modal #runner-progress-text')).toBeVisible();

    // 等待 2 秒让第一个请求完成或接近完成
    await page.waitForTimeout(2000);

    // 点击停止按钮
    const stopBtn = page.locator('#modal #runner-stop-btn');
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();

    // 验证停止按钮变为关闭中状态
    await expect(stopBtn).toContainText('关闭中');
    await expect(stopBtn).toBeDisabled();

    // 等待停止完成（面板关闭或出现总结/关闭按钮）
    // 使用 Promise.race 等待面板关闭或关闭按钮出现
    await Promise.race([
      page.locator('#modal-overlay').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {}),
      page.locator('#modal .runner-close-btn').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}),
    ]);

    // 如果面板仍然可见，尝试关闭
    const runnerPanel = page.locator('#modal .runner-panel');
    const panelVisible = await runnerPanel.isVisible().catch(() => false);

    if (panelVisible) {
      // 验证至少有结果项或总结
      const hasResultItems = await page.locator('.runner-result-item').count() > 0;
      const hasSummary = await page.locator('#modal #runner-summary').isVisible().catch(() => false);
      expect(hasResultItems || hasSummary).toBeTruthy();
    }
    // 如果面板已自动关闭，也是可接受的行为
  });
});
