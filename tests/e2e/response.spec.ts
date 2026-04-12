import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab, switchResponseTab } from './helpers/wait';
import { ResponsePage } from './pages/response-page';


test.describe('响应格式切换', () => {
  let rp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new ResponsePage(page);
  });

  test('JSON 响应 Pretty/Raw/Preview 切换', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/json`, '200');

    await expect(rp.formatBar).toBeVisible();

    // 默认 Pretty
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/);

    // 切换到 Raw
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    await expect(page.locator('.format-tab[data-format="pretty"]')).not.toHaveClass(/active/);

    // 切换到 Preview
    await rp.switchFormat('preview');
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/);

    // 切回 Pretty
    await rp.switchFormat('pretty');
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/);
  });

  test('HTML 响应自动进入 Preview 模式', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/html`, '200');

    // HTML 响应应自动选择 Preview
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5000 });

    // 验证 iframe 预览
    const iframe = page.locator('#response-format-content .html-preview-frame');
    await expect(iframe).toBeVisible({ timeout: 5000 });
  });

  test('HTML 响应切换到 Raw 显示原始 HTML', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/html`, '200');

    // 等待 Preview 模式加载
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5000 });

    // 切换到 Raw
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);

    // 验证内容包含 HTML 标签
    await expect(rp.formatContent).toContainText('<html', { timeout: 5000 });
  });

  test('XML 响应 Pretty 格式化', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/xml`, '200');

    // 默认 Pretty
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/, { timeout: 5000 });

    // 验证内容包含 XML 结构
    await expect(rp.formatContent).toContainText('<?xml', { timeout: 5000 });
    await expect(rp.formatContent).toContainText('<slideshow');

    // 切换到 Raw
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    // Raw 也应包含 XML
    await expect(rp.formatContent).toContainText('<?xml');
  });

  test('图片响应 Preview 显示图片', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/image/png`, '200');

    // 图片响应应自动选择 Preview
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5000 });

    // 验证图片预览
    const previewImg = page.locator('#response-format-content .preview-img');
    await expect(previewImg).toBeVisible({ timeout: 5000 });
  });
});

test.describe('响应状态码样式', () => {
  let rp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new ResponsePage(page);
  });

  test('4xx 响应状态码样式', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/status/404`, '404');
    await expect(rp.statusEl).toHaveClass(/status-4xx/);
  });

  test('5xx 响应状态码样式', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/status/500`, '500');
    await expect(rp.statusEl).toHaveClass(/status-5xx/);
  });

  test('3xx 重定向响应状态码样式', async ({ page }) => {
    // 关闭跟随重定向以看到 3xx 状态码
    await page.locator('#request-options-btn').click();
    await page.locator('.request-options-switch').click();
    await page.locator('#request-options-btn').click();

    // 发送请求到重定向端点
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/redirect/1`);
    await page.locator('#send-btn').click();
    await expect(rp.statusEl).toContainText('302');

    // 验证 3xx 状态码样式
    await expect(rp.statusEl).toHaveClass(/status-3xx/);

    // 恢复跟随重定向
    await page.locator('#request-options-btn').click();
    await page.locator('.request-options-switch').click();
    await page.locator('#request-options-btn').click();
  });
});

test.describe('响应标签页', () => {
  let rp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new ResponsePage(page);
  });

  test('响应 Cookies 标签页', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?test=123`, '200');

    await rp.switchTab('cookies');
    await expect(rp.cookies).toBeVisible();
  });

  test('响应 Test Results 标签页（无测试时）', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await rp.switchTab('test-results');
    await expect(rp.testResults).toBeVisible();
  });
});

test.describe('响应搜索导航', () => {
  let rp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new ResponsePage(page);
  });

  test('响应搜索功能', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await rp.openSearch();
    await rp.search('url');

    // 验证搜索计数
    const countText = await rp.getSearchCountText();
    expect(countText).not.toBe('');

    await rp.closeSearch();
  });

  test('Ctrl+F 打开响应搜索', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 确保响应面板 body 标签活跃
    await switchResponseTab(page, 'body');

    // Ctrl+F
    await page.locator('#response-panel').press('Control+f');

    await expect(rp.searchBar).toBeVisible();
  });

  test('搜索匹配计数显示正确', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();

    // 搜索 "localhost" — mock /get 响应中 Host 和 url 各出现一次
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5000 });
  });

  test('点击下一匹配按钮导航', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');

    const initialCount = await rp.getSearchCountText();

    // 点击下一匹配
    await rp.nextMatch();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const afterCount = await rp.getSearchCountText();
    // 计数应该变化（搜索结果包含多个匹配）
    expect(initialCount).not.toBe('1/1');
    expect(afterCount).not.toBe(initialCount);
  });

  test('点击上一匹配按钮导航', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');

    // 先前进到第二个匹配
    await rp.nextMatch();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const countAfterNext = await rp.getSearchCountText();

    // 再后退
    await rp.prevMatch();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const countAfterPrev = await rp.getSearchCountText();
    // 应该回到之前的计数
    expect(countAfterNext).not.toBe('1/1');
    expect(countAfterPrev).not.toBe(countAfterNext);
  });

  test('下一匹配按钮循环回第一个', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');

    const countText = await rp.getSearchCountText();
    // 解析总匹配数
    const totalMatch = countText?.split('/')[1];
    expect(totalMatch).toBeDefined();
    expect(parseInt(totalMatch!)).toBeGreaterThan(1);

    // 连续点击 next 直到到达最后一个
    const total = parseInt(totalMatch!);
    for (let i = 0; i < total; i++) {
      await rp.nextMatch();
      await page.waitForFunction(
        ([selector]) => document.querySelector(selector)?.textContent !== '',
        ['#response-search-count'],
      );
    }
    // 应该循环回到 1/N
    const finalCount = await rp.getSearchCountText();
    expect(finalCount).toBe(`1/${totalMatch}`);
  });

  test('上一匹配按钮循环到最后一个', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');

    const countText = await rp.getSearchCountText();
    const totalMatch = countText?.split('/')[1];
    expect(totalMatch).toBeDefined();
    expect(parseInt(totalMatch!)).toBeGreaterThan(1);

    // 在第一个匹配时按 prev
    await rp.prevMatch();
    await page.waitForFunction(
      ([selector]) => document.querySelector(selector)?.textContent !== '',
      ['#response-search-count'],
    );

    const finalCount = await rp.getSearchCountText();
    expect(finalCount).toBe(`${totalMatch}/${totalMatch}`);
  });

  test('清空搜索词清除高亮', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();

    await rp.searchInput.fill('localhost');
    // 等待搜索高亮出现
    await expect(page.locator('#response-format-content .search-highlight').first()).toBeVisible({ timeout: 5000 });

    // 验证有高亮
    const highlights = page.locator('#response-format-content .search-highlight');
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);

    // 清空搜索
    await rp.searchInput.fill('');
    // 等待高亮清除
    await expect(page.locator('#response-format-content .search-highlight')).toHaveCount(0, { timeout: 5000 });
  });

  test('按 Escape 关闭搜索栏', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    await switchResponseTab(page, 'body');
    await rp.openSearch();

    await rp.searchInput.fill('test');
    await rp.searchInput.press('Escape');

    await expect(rp.searchBar).toBeHidden();
  });

  test('在 Raw 格式下搜索正常工作', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 切换到 Raw 格式
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);

    await rp.openSearch();
    await rp.search('localhost');

    const countText = await rp.getSearchCountText();
    expect(countText).not.toBe('');
    expect(countText).toMatch(/\d+\/\d+/);
  });
});

test.describe('请求方法(PUT/DELETE)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('发送 PUT 请求', async ({ page }) => {
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/put`);

    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill('{"method": "PUT"}');

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('PUT');
  });

  test('发送 DELETE 请求', async ({ page }) => {
    await page.locator('#method-select').selectOption('DELETE');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delete`, '200');
  });
});

test.describe('脚本日志', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Script 日志显示', async ({ page }) => {
    // 编写包含 console.log 的 Pre-request Script
    await switchRequestTab(page, 'script');
    const textarea = page.locator('#script-textarea');
    await textarea.fill("console.log('hello from script'); console.log('second log')");

    // 发送请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 验证脚本日志显示
    await expect(page.locator('.response-logs')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.response-logs')).toContainText('hello from script');
    await expect(page.locator('.response-logs')).toContainText('second log');
  });

  test('Post-response Script 日志显示', async ({ page }) => {
    // 编写包含 console.log 的 Post-response Script
    await switchRequestTab(page, 'tests');
    const textarea = page.locator('#post-script-textarea');
    await textarea.fill("console.log('post log: ' + response.status)");

    // 发送请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 验证 post-response 脚本日志显示
    await expect(page.locator('.response-logs')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.response-logs')).toContainText('post log');
  });
});
