import { test, expect } from '@playwright/test';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab, switchResponseTab } from './helpers/wait';


test.describe('发送请求与响应', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    await page.waitForLoadState("networkidle");
    });

  test('发送 GET 请求并显示响应', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('#response-time')).toBeVisible();
    await expect(page.locator('#response-size')).toBeVisible();
  });

  test('切换请求方法并发送 POST 请求', async ({ page }) => {

    // 切换到 POST
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);

    // 切换到 Body 标签页
    await switchRequestTab(page, 'body');

    // body-type-select 默认已经是 json，直接填写 textarea
    const textarea = page.locator('#body-textarea');
    await textarea.fill('{"hello": "world"}');
    // 等待 debounce 将值同步到 store

    // 发送请求
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证响应体中包含发送的数据
    const responseBody = page.locator('#response-body');
    await expect(responseBody).toContainText('hello');
    await expect(responseBody).toContainText('world');
  });

  test('使用 Ctrl+Enter 快捷键发送请求', async ({ page }) => {
    const urlInput = page.locator('#url-input');
    await urlInput.fill(`${MOCK_BASE_URL}/get`);
    // 确保输入框聚焦后再按快捷键
    await urlInput.focus();
    await urlInput.press('Control+Enter');

    await expect(page.locator('#response-status')).toContainText('200');
  });

  test('切换响应标签页查看响应头', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 切换到 Headers 标签页
    await switchResponseTab(page, 'headers');
    await expect(page.locator('#response-headers')).toBeVisible();
  });
});
