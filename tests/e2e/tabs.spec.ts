import { test, expect } from '@playwright/test';

test.describe('标签页管理', () => {
  test('默认存在一个标签页', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.request-tab')).toHaveCount(1);
    await expect(page.locator('.request-tab.active')).toBeVisible();
  });

  test('点击 + 按钮创建新标签页', async ({ page }) => {
    await page.goto('/');
    const addBtn = page.locator('.request-tab-add');
    await addBtn.click();
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });

  test('切换标签页', async ({ page }) => {
    await page.goto('/');
    // 创建第二个标签页
    await page.locator('.request-tab-add').click();
    const tabs = page.locator('.request-tab');

    // 新创建的标签页自动成为激活状态
    await expect(tabs.nth(1)).toHaveClass(/active/);

    // 点击第一个标签页切换回去
    await tabs.first().click();
    await expect(tabs.first()).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
  });

  test('关闭标签页', async ({ page }) => {
    await page.goto('/');
    // 创建第二个标签页
    await page.locator('.request-tab-add').click();
    await expect(page.locator('.request-tab')).toHaveCount(2);

    // 关闭第二个标签页
    const closeBtn = page.locator('.request-tab').nth(1).locator('.request-tab-close');
    await closeBtn.click();
    await expect(page.locator('.request-tab')).toHaveCount(1);
  });
});
