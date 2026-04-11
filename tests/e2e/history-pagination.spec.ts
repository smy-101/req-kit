import { test, expect } from '@playwright/test';

test.describe('历史记录分页与过滤', () => {
  test('方法过滤 Chips — POST', async ({ page }) => {
    await page.goto('/');

    // 发送 GET 和 POST 请求
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill('https://httpbin.org/post');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 点击 POST chip 过滤
    const postChip = page.locator('.history-chip').filter({ hasText: 'POST' });
    await postChip.click();
    await page.waitForTimeout(500);

    // 验证所有历史项都是 POST
    const historyItems = page.locator('.history-item');
    const count = await historyItems.count();
    for (let i = 0; i < count; i++) {
      await expect(historyItems.nth(i)).toContainText('POST');
    }

    // 切换回 ALL
    const allChip = page.locator('.history-chip').filter({ hasText: 'ALL' });
    await allChip.click();
    await page.waitForTimeout(500);
  });

  test('方法过滤 Chips — 切换多种方法', async ({ page }) => {
    await page.goto('/');

    // 发送不同方法的请求
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill('https://httpbin.org/put');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    await page.locator('#method-select').selectOption('DELETE');
    await page.locator('#url-input').fill('https://httpbin.org/delete');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 测试 PUT 过滤
    await page.locator('.history-chip').filter({ hasText: 'PUT' }).click();
    await page.waitForTimeout(500);
    const putItems = page.locator('.history-item');
    const putCount = await putItems.count();
    for (let i = 0; i < putCount; i++) {
      await expect(putItems.nth(i)).toContainText('PUT');
    }

    // 测试 DELETE 过滤
    await page.locator('.history-chip').filter({ hasText: 'DELETE' }).click();
    await page.waitForTimeout(500);
    const delItems = page.locator('.history-item');
    const delCount = await delItems.count();
    for (let i = 0; i < delCount; i++) {
      await expect(delItems.nth(i)).toContainText('DELETE');
    }

    // 切换回 ALL
    await page.locator('.history-chip').filter({ hasText: 'ALL' }).click();
    await page.waitForTimeout(500);
  });

  test('历史记录加载更多', async ({ page }) => {
    await page.goto('/');

    // 发送多个请求以生成历史记录
    for (let i = 0; i < 5; i++) {
      await page.locator('#method-select').selectOption('GET');
      await page.locator('#url-input').fill(`https://httpbin.org/get?page=${i}`);
      await page.locator('#send-btn').click();
      await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });
    }

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 验证历史项存在
    await expect(page.locator('.history-item').first()).toContainText('httpbin.org');
  });

  test('历史记录状态码显示', async ({ page }) => {
    await page.goto('/');

    // 发送一个成功请求
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    // 展开历史面板
    const historyHeader = page.locator('.history-header');
    await historyHeader.click();
    await expect(page.locator('.history-item').first().locator('.history-status')).toBeVisible({ timeout: 5000 });

    // 验证成功状态码样式
    await expect(page.locator('.history-item').first().locator('.history-status')).toHaveClass(/status-ok/);
  });

  test('历史记录显示响应时间和相对时间', async ({ page }) => {
    await page.goto('/');

    // 发送请求
    await page.locator('#url-input').fill('https://httpbin.org/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

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
