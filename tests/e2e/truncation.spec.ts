import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';

/**
 * 响应截断警告测试
 *
 * 后端 routes/proxy.ts 已修复：PipelineResult 和 ProxyApiSuccessResponse 接口
 * 现在包含 truncated 字段，并在路由处理函数中正确传递给客户端。
 * 前端 response-viewer.js 已有对应的警告显示逻辑。
 *
 * 剩余阻塞：MAX_RESPONSE_SIZE 默认为 50MB，在 E2E 测试中难以触发如此大的响应。
 * 截断逻辑的正确性已通过单元测试（tests/unit/proxy.test.ts）和流式路径测试覆盖。
 *
 * 启用此测试需要：将 MAX_RESPONSE_SIZE 改为可配置（环境变量），
 * 并在测试 fixture 中设置较小的阈值。
 */
test.describe('响应截断警告', () => {
  test.fixme('超大响应显示截断警告', async ({ page }) => {
    await page.goto('/');

    // 发送请求到超大响应端点（需 mock server 支持）
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/large-json`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证截断警告出现
    await expect(page.locator('.response-warning')).toBeVisible();
    await expect(page.locator('.response-warning')).toContainText('Response truncated');
  });
});
