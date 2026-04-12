import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('历史记录分页与过滤', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('方法过滤 Chips — POST', async ({ page }) => {


    // 发送 GET 和 POST 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await page.locator('#method-select').selectOption('POST');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 点击 POST chip 过滤
    const postChip = page.locator('.history-chip').filter({ hasText: 'POST' });
    await postChip.click();

    // 验证所有历史项都是 POST
    const historyItems = page.locator('.history-item');
    const count = await historyItems.count();
    for (let i = 0; i < count; i++) {
      await expect(historyItems.nth(i)).toContainText('POST');
    }

    // 切换回 ALL
    const allChip = page.locator('.history-chip').filter({ hasText: 'ALL' });
    await allChip.click();
  });

  test('方法过滤 Chips — 切换多种方法', async ({ page }) => {

    // 发送不同方法的请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await page.locator('#method-select').selectOption('PUT');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/put`, '200');

    await page.locator('#method-select').selectOption('DELETE');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delete`, '200');

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 测试 PUT 过滤
    await page.locator('.history-chip').filter({ hasText: 'PUT' }).click();
    const putItems = page.locator('.history-item');
    const putCount = await putItems.count();
    for (let i = 0; i < putCount; i++) {
      await expect(putItems.nth(i)).toContainText('PUT');
    }

    // 测试 DELETE 过滤
    await page.locator('.history-chip').filter({ hasText: 'DELETE' }).click();
    const delItems = page.locator('.history-item');
    const delCount = await delItems.count();
    for (let i = 0; i < delCount; i++) {
      await expect(delItems.nth(i)).toContainText('DELETE');
    }

    // 切换回 ALL
    await page.locator('.history-chip').filter({ hasText: 'ALL' }).click();
  });

  test('历史记录加载更多', async ({ page }) => {

    // 发送多个请求以生成历史记录
    await page.locator('#method-select').selectOption('GET');
    for (let i = 0; i < 5; i++) {
      await sendRequestAndWait(page, `${MOCK_BASE_URL}/get?page=${i}`, '200', { timeout: 30_000 });
    }

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 验证历史项存在
    await expect(page.locator('.history-item').first()).toContainText('localhost:4000');
  });

  test('历史记录状态码显示', async ({ page }) => {

    // 发送一个成功请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first().locator('.history-status')).toBeVisible({ timeout: 5000 });

    // 验证成功状态码样式
    await expect(page.locator('.history-item').first().locator('.history-status')).toHaveClass(/status-ok/);
  });

  test('历史记录显示响应时间和相对时间', async ({ page }) => {

    // 发送请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 验证显示响应时间
    await expect(page.locator('.history-item').first().locator('.history-time')).toBeVisible();

    // 验证显示相对时间（中文环境显示"刚刚"等）
    await expect(page.locator('.history-item').first().locator('.history-ago')).toBeVisible();
  });
});
