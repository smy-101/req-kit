import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('HTTP 方法测试', () => {
  test('HEAD 请求', async ({ page }) => {
    await page.goto('/');

    // 切换到 HEAD 方法
    await page.locator('#method-select').selectOption('HEAD');
    await expect(page.locator('#method-select')).toHaveValue('HEAD');

    // 发送 HEAD 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // HEAD 请求应该没有响应体或响应体为空
    const responseBody = page.locator('#response-format-content');
    const bodyText = await responseBody.textContent();
    expect(bodyText).toBeFalsy();
  });

  test('PATCH 请求', async ({ page }) => {
    await page.goto('/');

    // 切换到 PATCH 方法
    await page.locator('#method-select').selectOption('PATCH');
    await expect(page.locator('#method-select')).toHaveValue('PATCH');

    // 发送 PATCH 请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/patch`, '200');

    // 验证响应包含请求信息
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('patch');
  });

  test('OPTIONS 请求', async ({ page }) => {
    await page.goto('/');

    await page.locator('#method-select').selectOption('OPTIONS');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/anything`, '200');

    await expect(page.locator('#response-time')).toBeVisible();
  });
});

test.describe('重定向测试', () => {
  test('关闭重定向后收到 3xx 响应', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/redirect/1`);

    // 关闭 Follow Redirects
    await page.locator('#request-options-btn').click();
    await page.locator('.request-options-switch').click();

    await expect(page.locator('#url-input')).toHaveValue(`${MOCK_BASE_URL}/redirect/1`);

    await page.locator('#send-btn').click();

    // 应收到 302 而不是 200
    await expect(page.locator('#response-status')).toContainText('302');
  });

  test('开启重定向时自动跟随 302', async ({ page }) => {
    await page.goto('/');

    await page.locator('#request-options-btn').click();
    await expect(page.locator('#request-redirect-toggle')).toBeChecked();

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/redirect/1`, '200');
  });
});

test.describe('请求超时行为', () => {
  test('请求超时后显示错误状态', async ({ page }) => {
    await page.goto('/');

    // 设置超时为 1 秒
    await page.locator('#request-options-btn').click();
    const timeoutInput = page.locator('#request-timeout-input');
    await timeoutInput.fill('1000');

    // 发送到需要 5 秒的延迟端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delay/5`);
    await page.locator('#send-btn').click();

    // 应显示 5xx 错误状态样式
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    await expect(page.locator('#response-time')).toBeVisible();
  });

  test('正常请求在超时时间内完成', async ({ page }) => {
    await page.goto('/');

    // 设置超时为 10 秒
    await page.locator('#request-options-btn').click();
    const timeoutInput = page.locator('#request-timeout-input');
    await timeoutInput.fill('10000');

    // 发送到 2 秒延迟端点
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delay/2`, '200');
  });
});

test.describe('请求取消', () => {
  test('发送按钮在请求中变为取消按钮', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delay/5`);
    await page.locator('#send-btn').click();

    // 验证按钮变为取消状态
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'true');

    // 验证按钮显示 Cancel
    await expect(page.locator('#send-btn')).toContainText('Cancel');

    // 点击取消
    await page.locator('#send-btn').click();

    // 验证按钮恢复为 Send 状态
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'false');
    await expect(page.locator('#send-btn')).toContainText('Send');
  });

  test('取消请求后显示取消状态', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/delay/5`);
    await page.locator('#send-btn').click();

    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'true');

    // 点击取消
    await page.locator('#send-btn').click();

    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'false');

    // 验证显示取消错误
    await expect(page.locator('.response-error')).toBeVisible();
  });
});

test.describe('请求选项', () => {
  test('打开请求选项面板', async ({ page }) => {
    await page.goto('/');

    const optionsBtn = page.locator('#request-options-btn');
    const optionsPanel = page.locator('#request-options-panel');

    await expect(optionsPanel).toBeHidden();
    await optionsBtn.click();
    await expect(optionsPanel).toBeVisible();
    await expect(optionsBtn).toHaveClass(/active/);

    // 再次点击关闭
    await optionsBtn.click();
    await expect(optionsPanel).toBeHidden();
  });

  test('修改超时时间', async ({ page }) => {
    await page.goto('/');

    await page.locator('#request-options-btn').click();
    const timeoutInput = page.locator('#request-timeout-input');

    // 默认值 30000
    await expect(timeoutInput).toHaveValue('30000');

    await timeoutInput.fill('5000');

    // 切换标签页再回来验证值保留
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#request-panel .tab[data-tab="headers"]').click();
    await page.locator('#request-options-btn').click();
    await expect(timeoutInput).toHaveValue('5000');
  });

  test('切换 Follow Redirects 开关', async ({ page }) => {
    await page.goto('/');

    await page.locator('#request-options-btn').click();
    const redirectToggle = page.locator('#request-redirect-toggle');

    // 默认开启
    await expect(redirectToggle).toBeChecked();

    // checkbox 是隐藏的，需要点击父级 label 来切换
    await page.locator('.request-options-switch').click();

    // 切换标签页再回来验证
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#request-panel .tab[data-tab="headers"]').click();
    await page.locator('#request-options-btn').click();
    await expect(redirectToggle).not.toBeChecked();
  });
});
