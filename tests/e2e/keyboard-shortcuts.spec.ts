import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { waitForModal, waitForModalClose } from './helpers/wait';

test.describe('键盘快捷键', () => {
  test('Ctrl+T 创建新标签页', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.request-tab')).toHaveCount(1);

    await page.keyboard.press('Control+t');
    await expect(page.locator('.request-tab')).toHaveCount(2);
    await expect(page.locator('.request-tab').nth(1)).toHaveClass(/active/);
  });

  test('Ctrl+W 关闭当前标签页', async ({ page }) => {
    await page.goto('/');
    // 先创建第二个标签页
    await page.keyboard.press('Control+t');
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // Ctrl+W 关闭当前（第二个）标签页
    await page.keyboard.press('Control+w');
    await expect(page.locator('.request-tab')).toHaveCount(1);
    await expect(page.locator('.request-tab').first()).toHaveClass(/active/);
  });

  test('Ctrl+Tab 切换到下一个标签页', async ({ page }) => {
    await page.goto('/');
    // 创建两个新标签页，共 3 个
    await page.keyboard.press('Control+t');
    await page.keyboard.press('Control+t');
    await expect(page.locator('.request-tab')).toHaveCount(3);

    // 第三个标签页是激活的
    await expect(page.locator('.request-tab').nth(2)).toHaveClass(/active/);

    // Ctrl+Tab 切换到第一个
    await page.keyboard.press('Control+Tab');
    await expect(page.locator('.request-tab').nth(0)).toHaveClass(/active/);
  });

  test('Ctrl+Shift+Tab 切换到上一个标签页', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+t');
    await page.keyboard.press('Control+t');
    await expect(page.locator('.request-tab')).toHaveCount(3);

    // 第三个标签页是激活的
    await expect(page.locator('.request-tab').nth(2)).toHaveClass(/active/);

    // Ctrl+Shift+Tab 切换到第二个
    await page.keyboard.press('Control+Shift+Tab');
    await expect(page.locator('.request-tab').nth(1)).toHaveClass(/active/);
  });

  test('Escape 关闭模态框', async ({ page }) => {
    await page.goto('/');

    // 打开环境管理弹窗
    await page.locator('#btn-manage-env').click();
    await waitForModal(page);

    // Escape 关闭
    await page.keyboard.press('Escape');
    await waitForModalClose(page);
  });

  test('Ctrl+S 保存请求（无集合时提示创建）', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    // Ctrl+S 触发保存 — 无集合时应弹出提示
    await page.keyboard.press('Control+s');

    // 应弹出提示创建集合的对话框
    await waitForModal(page);
  });

  test('Ctrl+Shift+N 新建请求（无集合时提示创建）', async ({ page }) => {
    await page.goto('/');

    // Ctrl+Shift+N 触发 saveAsNewRequest — 无集合时应弹出提示
    await page.keyboard.press('Control+Shift+N');

    // 应弹出提示创建集合的对话框
    await waitForModal(page);
  });
});
