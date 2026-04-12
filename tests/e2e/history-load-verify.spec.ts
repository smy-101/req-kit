import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab } from './helpers/wait';

test.describe('历史记录加载验证', () => {
  test('点击历史记录加载 POST 请求并验证数据', async ({ page }) => {
    await page.goto('/');

    // 发送 POST 请求（使用唯一 URL 参数标识）
    const uniqueId = Date.now() % 100000000;
    const uniqueMarker = `history_verify_${uniqueId}`;
    const testBody = `{"test": "${uniqueMarker}"}`;
    const testUrl = `${MOCK_BASE_URL}/post/${uniqueId}`;
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(testUrl);
    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill(testBody);

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 打开历史面板
    await page.locator('.history-header').click();
    await expect(page.locator('.history-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 找到包含我们唯一 URL 标识的历史记录
    const targetItem = page.locator('.history-item').filter({ hasText: `post/${uniqueId}` }).first();
    await expect(targetItem).toBeVisible({ timeout: 5000 });

    // 记录当前标签数量
    const tabCountBefore = await page.locator('.request-tab').count();

    // 点击匹配的历史记录
    await targetItem.click();

    // 如果创建了新标签，切换到最后一个
    const tabs = page.locator('.request-tab');
    const tabCount = await tabs.count();
    if (tabCount > tabCountBefore) {
      await tabs.last().click();
    }

    // 验证方法是 POST（等待加载完成）
    await expect(page.locator('#method-select')).toHaveValue('POST', { timeout: 10000 });

    // 验证 URL 包含我们的唯一标识（input 元素用 toHaveValue）
    await expect(page.locator('#url-input')).toHaveValue(new RegExp(`post/${uniqueId}`), { timeout: 10000 });

    // 验证 body 包含测试数据（textarea 用 toHaveValue）
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await expect(page.locator('#body-textarea')).toHaveValue(new RegExp(uniqueMarker), { timeout: 5000 });
  });

  test('点击历史记录恢复响应数据', async ({ page }) => {
    await page.goto('/');

    // 发送 GET 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/uuid`, '200');

    // 打开历史面板
    await page.locator('.history-header').click();
    await expect(page.locator('.history-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 点击历史记录
    await page.locator('.history-item').first().click();

    // 如果创建了新标签，切换到最后一个
    const tabs = page.locator('.request-tab');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      await tabs.last().click();
    }

    // 验证响应仍然存在（状态码 200）
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 5000 });

    // 验证响应面板有内容
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).not.toBeEmpty({ timeout: 5000 });
  });

  test('匹配的历史记录在当前标签页加载不创建新标签', async ({ page }) => {
    await page.goto('/');

    // 发送 GET 请求到特定 URL
    const testUrl = `${MOCK_BASE_URL}/get?unique=${Date.now()}`;
    await sendRequestAndWait(page, testUrl, '200');

    // 确认只有一个标签
    await expect(page.locator('.request-tab')).toHaveCount(1);

    // 打开历史面板
    await page.locator('.history-header').click();
    await expect(page.locator('.history-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.history-item').first()).toBeVisible({ timeout: 5000 });

    // 找到匹配 URL 的历史记录
    const targetItem = page.locator('.history-item').filter({ hasText: testUrl.substring(0, 40) }).first();
    await expect(targetItem).toBeVisible({ timeout: 5000 });

    // 点击匹配的历史记录（同 URL + 同方法应匹配当前标签）
    await targetItem.click();

    // 仍然应该只有一个标签
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });
});
