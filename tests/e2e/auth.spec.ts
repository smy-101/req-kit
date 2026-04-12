import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab } from './helpers/wait';


test.describe('认证面板', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('默认认证类型为 None', async ({ page }) => {
    await switchRequestTab(page, 'auth');

    const authTypeSelect = page.locator('#auth-type-select');
    await expect(authTypeSelect).toHaveValue('none');
  });

  test('切换到 Bearer Token 并输入 token', async ({ page }) => {
    await switchRequestTab(page, 'auth');

    await page.locator('#auth-type-select').selectOption('bearer');
    await expect(page.locator('#auth-token')).toBeVisible();

    await page.locator('#auth-token').fill('my-secret-token');

    // 切换标签页再切回来验证
    await switchRequestTab(page, 'headers');
    await switchRequestTab(page, 'auth');
    await expect(page.locator('#auth-token')).toHaveValue('my-secret-token');
  });

  test('切换到 Basic Auth 并输入用户名密码', async ({ page }) => {
    await switchRequestTab(page, 'auth');

    await page.locator('#auth-type-select').selectOption('basic');
    await expect(page.locator('#auth-username')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();

    await page.locator('#auth-username').fill('admin');
    await page.locator('#auth-password').fill('secret');
  });

  test('切换到 API Key 并配置', async ({ page }) => {
    await switchRequestTab(page, 'auth');

    await page.locator('#auth-type-select').selectOption('apikey');
    await expect(page.locator('#auth-apikey-key')).toBeVisible();
    await expect(page.locator('#auth-apikey-value')).toBeVisible();
    await expect(page.locator('#auth-apikey-in')).toBeVisible();

    await page.locator('#auth-apikey-key').fill('X-API-Key');
    await page.locator('#auth-apikey-value').fill('abc123');

    // 默认是 header
    await expect(page.locator('#auth-apikey-in')).toHaveValue('header');

    // 切换到 query params
    await page.locator('#auth-apikey-in').selectOption('query');
    await expect(page.locator('#auth-apikey-in')).toHaveValue('query');
  });

  test('Bearer Token 认证发送请求', async ({ page }) => {
    await switchRequestTab(page, 'auth');
    await page.locator('#auth-type-select').selectOption('bearer');
    await page.locator('#auth-token').fill('test-token-123');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // httpbin 的 /get 会返回 Authorization header
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('Bearer');
    await expect(responseBody).toContainText('test-token-123');
  });

  test('Basic Auth 认证配置', async ({ page }) => {
    await switchRequestTab(page, 'auth');
    await page.locator('#auth-type-select').selectOption('basic');

    // 等待字段渲染
    await expect(page.locator('#auth-username')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();

    await page.locator('#auth-username').fill('myuser');
    await page.locator('#auth-password').fill('mypass');

    // 验证输入值保留
    await expect(page.locator('#auth-username')).toHaveValue('myuser');
    await expect(page.locator('#auth-password')).toHaveValue('mypass');

    // 切换标签页再切回来验证
    await switchRequestTab(page, 'headers');
    await switchRequestTab(page, 'auth');
    await expect(page.locator('#auth-username')).toHaveValue('myuser');
    await expect(page.locator('#auth-password')).toHaveValue('mypass');
  });

  test('API Key Query 参数配置', async ({ page }) => {
    await switchRequestTab(page, 'auth');
    await page.locator('#auth-type-select').selectOption('apikey');

    // 等待字段渲染
    await expect(page.locator('#auth-apikey-key')).toBeVisible();
    await expect(page.locator('#auth-apikey-value')).toBeVisible();

    await page.locator('#auth-apikey-key').fill('api_key');
    await page.locator('#auth-apikey-value').fill('secret123');
    await page.locator('#auth-apikey-in').selectOption('query');

    // 验证配置保留
    await expect(page.locator('#auth-apikey-key')).toHaveValue('api_key');
    await expect(page.locator('#auth-apikey-value')).toHaveValue('secret123');
    await expect(page.locator('#auth-apikey-in')).toHaveValue('query');
  });
});
