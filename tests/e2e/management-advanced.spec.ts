import { test, expect } from '@playwright/test';

test.describe('Cookie 高级管理', () => {
  test('删除单个 Cookie', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill('https://httpbin.org/cookies/set?ck_delete_1=v1&ck_delete_2=v2');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.waitForTimeout(2000);

    const deleteBtns = page.locator('.cookie-item-delete');
    const count = await deleteBtns.count();

    if (count > 0) {
      await deleteBtns.first().click();
      await page.waitForTimeout(500);
      const countAfter = await page.locator('.cookie-item-delete').count();
      expect(countAfter).toBe(count - 1);
    } else {
      await expect(page.locator('.cookie-empty-msg').or(page.locator('.cookie-item'))).toBeVisible();
    }
  });

  test('Cookie 管理弹窗总数显示', async ({ page }) => {
    await page.goto('/');

    await page.locator('#url-input').fill('https://httpbin.org/cookies/set?count_test=yes');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200', { timeout: 15000 });

    await page.locator('#btn-manage-cookies').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('.cookie-modal-total')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('全局变量编辑和删除', () => {
  test('编辑已存在的全局变量', async ({ page }) => {
    await page.goto('/');

    const key = `edit_var_${Date.now()}`;

    // 先添加一个全局变量
    await page.locator('#btn-manage-global-vars').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#modal .kv-add-btn').click();
    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-key').fill(key);
    await firstRow.locator('.kv-value').fill('original_value');

    await page.locator('#modal #save-global-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();

    // 再次打开编辑
    await page.locator('#btn-manage-global-vars').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 找到包含该 key 的行 — 通过检查 kv-key input 的实际值
    const rows = page.locator('#modal .kv-row');
    const rowCount = await rows.count();
    let targetRow = null;
    for (let i = 0; i < rowCount; i++) {
      const keyValue = await rows.nth(i).locator('.kv-key').inputValue();
      if (keyValue === key) {
        targetRow = rows.nth(i);
        break;
      }
    }
    expect(targetRow).not.toBeNull();
    await targetRow!.locator('.kv-value').fill('updated_value');

    await page.locator('#modal #save-global-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();

    // 打开变量预览面板验证
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('updated_value');
  });

  test('删除全局变量行后保存', async ({ page }) => {
    await page.goto('/');

    const key1 = `del_var1_${Date.now()}`;
    const key2 = `del_var2_${Date.now()}`;

    // 添加两个全局变量
    await page.locator('#btn-manage-global-vars').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(0).locator('.kv-key').fill(key1);
    await page.locator('#modal .kv-row').nth(0).locator('.kv-value').fill('val1');

    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(1).locator('.kv-key').fill(key2);
    await page.locator('#modal .kv-row').nth(1).locator('.kv-value').fill('val2');

    await page.locator('#modal #save-global-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();

    // 再次打开并删除第一个变量
    await page.locator('#btn-manage-global-vars').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    // 第一个 kv-row 应该是 key1，直接删除它
    const firstRow = page.locator('#modal .kv-row').first();
    await firstRow.locator('.kv-delete').click();
    await page.waitForTimeout(200);

    // 保存
    await page.locator('#modal #save-global-vars').click();
    await expect(page.locator('#modal-overlay')).not.toBeVisible();

    // 验证全局变量数量减少了
    await page.locator('#btn-var-preview').click();
    const panel = page.locator('#var-preview-panel');
    await expect(panel).toBeVisible();
    // key2 应该还在（因为只删除了第一行）
    await expect(panel).toContainText(key2);
  });
});

test.describe('环境变量管理', () => {
  test('删除单个环境变量行', async ({ page }) => {
    await page.goto('/');

    const envName = `EnvDel_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();

    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });

    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });

    // 添加两个变量
    await kvEditor.locator('.kv-add-btn').click();
    await kvEditor.locator('.kv-row').nth(0).locator('.kv-key').fill('keep_var');
    await kvEditor.locator('.kv-row').nth(0).locator('.kv-value').fill('keep');

    await kvEditor.locator('.kv-add-btn').click();
    await kvEditor.locator('.kv-row').nth(1).locator('.kv-key').fill('remove_var');
    await kvEditor.locator('.kv-row').nth(1).locator('.kv-value').fill('remove');

    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());

    // 删除第二个行（remove_var）
    await kvEditor.locator('.kv-row').nth(1).locator('.kv-delete').click();
    await page.waitForTimeout(200);

    // 保存
    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());
    await page.locator('#modal #close-env-modal').click();

    // 验证：选择该环境，重新打开编辑器，确认只剩一个变量
    await page.locator('#active-env').selectOption({ label: envName });
    await page.locator('#btn-manage-env').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    const editor = page.locator('#modal #env-vars-editor');
    await expect(editor.locator('.kv-row')).toHaveCount(1, { timeout: 5000 });
  });
});
