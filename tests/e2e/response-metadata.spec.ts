import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';

test.describe('响应元数据', () => {
  let rp: RequestPage;
  let resp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
    resp = new ResponsePage(page);
  });

  test('响应时间和大小正确显示', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 时间应为数字后跟 "ms"
    const timeText = await resp.getTime();
    expect(timeText).toMatch(/\d+ms/);

    // 大小应为格式化的字符串
    const sizeText = await resp.getSize();
    expect(sizeText).toMatch(/\d+\s*(B|KB|MB|GB)/);
  });

  test('不同状态码颜色样式', async ({ page }) => {
    // 2xx — 绿色
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(resp.statusEl).toHaveClass(/status-2xx/);

    // 3xx — 黄色
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/redirect/0`, '200');

    // 4xx — 橙色
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/status/404`, '404');
    await expect(resp.statusEl).toHaveClass(/status-4xx/);

    // 5xx — 红色
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/status/500`, '500');
    await expect(resp.statusEl).toHaveClass(/status-5xx/);
  });
});
