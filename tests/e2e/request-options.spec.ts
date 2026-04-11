import { test, expect } from '@playwright/test';

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
    await page.waitForTimeout(200);

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
    await page.waitForTimeout(200);

    // 切换标签页再回来验证
    await page.locator('#request-panel .tab[data-tab="body"]').click();
    await page.locator('#request-panel .tab[data-tab="headers"]').click();
    await page.locator('#request-options-btn').click();
    await expect(redirectToggle).not.toBeChecked();
  });
});
