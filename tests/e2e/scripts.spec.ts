import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';
import { TabBar } from './pages/tab-bar';


test.describe('脚本与测试', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('Pre-request Script 标签页显示编辑器', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.switchTab('script');

    await expect(page.locator('#script-textarea')).toBeVisible();
    // script-desc 存在于 DOM 中
    await expect(page.locator('#tab-script .script-desc')).toHaveCount(1);
  });

  test('编写 Pre-request Script 设置请求头', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.switchTab('script');

    const textarea = page.locator('#script-textarea');
    await textarea.fill("request.setHeader('X-Custom', 'hello')");

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('X-Custom');
    await expect(responseBody).toContainText('hello');
  });

  test('Pre-request Script 修改请求头（含 Content-Type）', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.selectMethod('POST');
    await rp.switchTab('script');

    const textarea = page.locator('#script-textarea');
    await textarea.fill("request.setHeader('X-Custom-Script', 'from-script')");

    await rp.setMockUrl('/post');
    await expect(() => {
      rp.clickSend();
      return expect(page.locator('#response-status')).toContainText('200');
    }).toPass({ timeout: 30_000 });

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('X-Custom-Script');
    await expect(responseBody).toContainText('from-script');
  });

  test('Post-response Tests 标签页显示编辑器', async ({ page }) => {
    const rp = new RequestPage(page);
    await rp.switchTab('tests');

    await expect(page.locator('#post-script-textarea')).toBeVisible();
    // script-desc 存在于 DOM 中
    await expect(page.locator('#tab-tests .script-desc')).toHaveCount(1);
  });

  test('编写测试断言并查看结果', async ({ page }) => {
    const rp = new RequestPage(page);
    const resp = new ResponsePage(page);
    await rp.switchTab('tests');

    const textarea = page.locator('#post-script-textarea');
    await textarea.fill('tests["Status is 200"] = response.status === 200');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 切换到 Test Results 标签页
    await resp.switchTab('test-results');
    await expect(resp.testResults).toBeVisible();

    // 验证测试通过 — 使用 .test-passed 类名
    await expect(resp.testResults).toContainText('Status is 200');
    await expect(resp.testResults.locator('.test-passed')).toBeVisible();
    await expect(resp.testResults).toContainText('1 passed');
  });

  test('测试断言失败显示失败状态', async ({ page }) => {
    const rp = new RequestPage(page);
    const resp = new ResponsePage(page);
    await rp.switchTab('tests');

    const textarea = page.locator('#post-script-textarea');
    await textarea.fill('tests["Should be 404"] = response.status === 404');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 切换到 Test Results 标签页
    await resp.switchTab('test-results');

    await expect(resp.testResults).toContainText('Should be 404');
    await expect(resp.testResults.locator('.test-failed')).toBeVisible();
    await expect(resp.testResults).toContainText('1 failed');
  });

  test('Tests 中设置变量并在后续请求中使用', async ({ page }) => {
    const rp = new RequestPage(page);
    const tabBar = new TabBar(page);
    await rp.switchTab('tests');

    const textarea = page.locator('#post-script-textarea');
    await textarea.fill(`variables.set("saved_url", "${MOCK_BASE_URL}/uuid")`);

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 创建新标签页
    await tabBar.addTab();

    // 在 URL 中使用变量
    await rp.setUrl('{{saved_url}}');

    await rp.clickSend();
    // 应该成功发送到 httpbin.org/uuid
    await expect(page.locator('#response-status')).toContainText('200');
  });

  test('Pre-request Script 在不同标签页间独立', async ({ page }) => {
    const rp = new RequestPage(page);
    const tabBar = new TabBar(page);

    // 在第一个标签页设置脚本
    await rp.switchTab('script');
    await page.locator('#script-textarea').fill('console.log("tab1")');

    // 创建新标签页
    await tabBar.addTab();

    // 验证新标签页的脚本是空的
    await expect(page.locator('#script-textarea')).toHaveValue('');
  });

  test('Pre-request Script 抛错阻止请求发送', async ({ page }) => {
    const rp = new RequestPage(page);

    // 设置 URL（send 按钮在 URL 为空时不会发送请求）
    await rp.setMockUrl('/get');

    await rp.switchTab('script');

    const textarea = page.locator('#script-textarea');
    await textarea.fill('throw new Error("script crash")');

    await rp.clickSend();

    // 应显示 Error 状态
    await expect(page.locator('#response-status')).toContainText('Error');
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);

    // 响应体应包含错误信息
    await expect(page.locator('#response-body')).toContainText('script crash');
  });
});
