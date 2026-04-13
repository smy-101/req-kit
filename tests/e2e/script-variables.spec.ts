import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, waitForModalClose } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';
import { EnvironmentPage } from './pages/environment-page';

test.describe('脚本中的变量访问', () => {
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
  });

  test('Pre-request 脚本通过 environment 读取环境变量', async ({ page }) => {
    const envPage = new EnvironmentPage(page);
    const envName = `ScriptEnv_${Date.now()}`;

    // 创建环境并添加变量
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('env_host', 'localhost:4000');
    await envPage.saveVariables();
    await envPage.close();
    await envPage.switchActiveEnv(envName);

    // 编写脚本：通过 environment 对象读取变量并设置到请求头
    await rp.switchTab('script');
    await page.locator('#script-textarea').fill("request.setHeader('X-Env-Host', environment.env_host)");

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // mock server /get 回显请求头，应包含通过 environment 读取的值
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('X-Env-Host');
    await expect(responseBody).toContainText('localhost:4000');
  });

  test('Pre-request 脚本使用 request.setBody() 覆盖请求体', async ({ page }) => {
    // 设置原始 body
    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.fillBody('{"original": true}');

    // 编写脚本覆盖 body
    await rp.switchTab('script');
    await page.locator('#script-textarea').fill("request.setBody('{\"overridden\": true}')");

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    const responseBody = page.locator('#response-format-content');
    // 应包含脚本覆盖后的内容
    await expect(responseBody).toContainText('overridden');
    // 不应包含原始 body 的内容
    await expect(responseBody).not.toContainText('original');
  });

  test('Pre-request 脚本使用 request.setParam() 添加查询参数', async ({ page }) => {
    await rp.switchTab('script');
    await page.locator('#script-textarea').fill("request.setParam('script_param', 'injected')");

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    // mock server /get 回显 args（查询参数）
    await expect(responseBody).toContainText('script_param');
    await expect(responseBody).toContainText('injected');
  });

  test('Post-response 脚本读取 environment 变量', async ({ page }) => {
    const resp = new ResponsePage(page);
    const envPage = new EnvironmentPage(page);
    const envName = `PostEnv_${Date.now()}`;

    // 创建环境并添加变量
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('check_val', 'expected_value');
    await envPage.saveVariables();
    await envPage.close();
    await envPage.switchActiveEnv(envName);

    // 编写后置脚本：通过 environment 读取变量并断言
    await rp.switchTab('tests');
    await page.locator('#post-script-textarea').fill(
      'tests["env var accessible"] = environment.check_val === "expected_value"',
    );

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 验证测试通过
    await resp.switchTab('test-results');
    await expect(resp.testResults).toContainText('env var accessible');
    await expect(resp.testResults.locator('.test-passed')).toBeVisible();
  });

  test('Post-response 脚本使用 variables.get() 读取环境变量', async ({ page }) => {
    const resp = new ResponsePage(page);
    const envPage = new EnvironmentPage(page);
    const envName = `VarGet_${Date.now()}`;

    // 创建环境并添加变量
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('api_token', 'secret123');
    await envPage.saveVariables();
    await envPage.close();
    await envPage.switchActiveEnv(envName);

    // Post-response 脚本通过 variables.get() 读取环境变量并断言
    await rp.switchTab('tests');
    await page.locator('#post-script-textarea').fill(
      'tests["var get works"] = variables.get("api_token") === "secret123"',
    );

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 验证测试通过
    await resp.switchTab('test-results');
    await expect(resp.testResults).toContainText('var get works');
    await expect(resp.testResults.locator('.test-passed')).toBeVisible();
  });
});
