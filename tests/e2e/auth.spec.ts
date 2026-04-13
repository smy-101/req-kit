import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { AuthPage } from './pages/auth-page';


test.describe('认证面板', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('默认认证类型为 None', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');

    await expect(auth.typeSelect).toHaveValue('none');
  });

  test('切换到 Bearer Token 并输入 token', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');

    await auth.selectType('bearer');
    await expect(auth.tokenInput).toBeVisible();

    await auth.fillBearerToken('my-secret-token');

    // 切换标签页再切回来验证
    await rp.switchTab('headers');
    await rp.switchTab('auth');
    await expect(auth.tokenInput).toHaveValue('my-secret-token');
  });

  test('切换到 Basic Auth 并输入用户名密码', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');

    await auth.selectType('basic');
    await expect(auth.usernameInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();

    await auth.fillBasicAuth('admin', 'secret');
  });

  test('切换到 API Key 并配置', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');

    await auth.selectType('apikey');
    await expect(auth.apiKeyKey).toBeVisible();
    await expect(auth.apiKeyValue).toBeVisible();
    await expect(auth.apiKeyIn).toBeVisible();

    await auth.apiKeyKey.fill('X-API-Key');
    await auth.apiKeyValue.fill('abc123');

    // 默认是 header
    await expect(auth.apiKeyIn).toHaveValue('header');

    // 切换到 query params
    await auth.apiKeyIn.selectOption('query');
    await expect(auth.apiKeyIn).toHaveValue('query');
  });

  test('Bearer Token 认证发送请求', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');
    await auth.selectType('bearer');
    await auth.fillBearerToken('test-token-123');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // httpbin 的 /get 会返回 Authorization header
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('Bearer');
    await expect(responseBody).toContainText('test-token-123');
  });

  test('Basic Auth 认证配置', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');
    await auth.selectType('basic');

    // 等待字段渲染
    await expect(auth.usernameInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();

    await auth.fillBasicAuth('myuser', 'mypass');

    // 验证输入值保留
    await expect(auth.usernameInput).toHaveValue('myuser');
    await expect(auth.passwordInput).toHaveValue('mypass');

    // 切换标签页再切回来验证
    await rp.switchTab('headers');
    await rp.switchTab('auth');
    await expect(auth.usernameInput).toHaveValue('myuser');
    await expect(auth.passwordInput).toHaveValue('mypass');
  });

  test('API Key Query 参数配置', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');
    await auth.selectType('apikey');

    // 等待字段渲染
    await expect(auth.apiKeyKey).toBeVisible();
    await expect(auth.apiKeyValue).toBeVisible();

    await auth.apiKeyKey.fill('api_key');
    await auth.apiKeyValue.fill('secret123');
    await auth.apiKeyIn.selectOption('query');

    // 验证配置保留
    await expect(auth.apiKeyKey).toHaveValue('api_key');
    await expect(auth.apiKeyValue).toHaveValue('secret123');
    await expect(auth.apiKeyIn).toHaveValue('query');
  });

  test('API Key Query 参数发送请求出现在 URL 中', async ({ page }) => {
    const rp = new RequestPage(page);
    const auth = new AuthPage(page);
    await rp.switchTab('auth');
    await auth.selectType('apikey');

    await auth.apiKeyKey.fill('api_key');
    await page.waitForTimeout(200);
    await auth.apiKeyValue.fill('secret123');
    await page.waitForTimeout(200);
    await auth.apiKeyIn.selectOption('query');
    await page.waitForTimeout(200);

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 验证 URL 中包含 api_key 参数
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('api_key');
    await expect(responseBody).toContainText('secret123');
  });
});
