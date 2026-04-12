import { test, expect } from './fixtures';
import { waitForModal, waitForModalClose, waitForAutocompletePopup, waitForAutocompleteClose, switchRequestTab } from './helpers/wait';

// 所有自动补全测试使用唯一前缀过滤，避免并行测试的全局变量干扰

test.describe('变量自动补全', () => {
  test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

  test('输入 {{ 触发变量自动补全弹窗', async ({ page }) => {

    const uniqueKey = `auto_trigger_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('test_value');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 使用前缀过滤只显示我们的变量
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{auto_trigger_`);
    await waitForAutocompletePopup(page);
  });

  test('自动补全弹窗显示变量名和作用域', async ({ page }) => {

    const uniqueKey = `scope_display_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('val');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{scope_display_`);
    await waitForAutocompletePopup(page);

    // 验证弹窗中包含我们的变量名
    await expect(page.locator('#var-autocomplete-popup')).toContainText(uniqueKey);
    // 验证包含作用域标签
    await expect(page.locator('.var-autocomplete-scope').first()).toContainText('Global');
  });

  test('环境变量出现在自动补全中', async ({ page }) => {

    const envName = `AutoEnv_${Date.now()}`;
    await page.locator('#btn-manage-env').click();
    await waitForModal(page);
    await page.locator('#modal #new-env-name').fill(envName);
    await page.locator('#modal #create-env-btn').evaluate(el => el.click());
    await expect(page.locator('#modal .env-item').filter({ hasText: envName })).toBeVisible({ timeout: 10000 });
    await page.locator('#modal .env-item .env-name').filter({ hasText: envName }).click();

    const kvEditor = page.locator('#modal #env-vars-editor');
    await expect(kvEditor.locator('.kv-add-btn')).toBeVisible({ timeout: 5000 });
    await kvEditor.locator('.kv-add-btn').click();
    const envKey = `env_auto_show_${Date.now()}`;
    await kvEditor.locator('.kv-row').first().locator('.kv-key').fill(envKey);
    await kvEditor.locator('.kv-row').first().locator('.kv-value').fill('env_val');
    await kvEditor.locator('.kv-save-btn').evaluate(el => el.click());
    await page.locator('#modal #close-env-modal').click();

    await page.locator('#active-env').selectOption({ label: envName });

    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{env_auto_show_`);
    await waitForAutocompletePopup(page);

    const popup = page.locator('#var-autocomplete-popup');
    await expect(popup).not.toHaveClass(/hidden/);
    await expect(popup).toContainText(envKey);
    await expect(popup.locator('.var-autocomplete-scope').first()).toContainText('Environment');
  });

  test('键盘上下箭头导航选择项', async ({ page }) => {

    const key1 = `nav_z_${Date.now()}`;
    const key2 = `nav_a_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(0).locator('.kv-key').fill(key1);
    await page.locator('#modal .kv-row').nth(0).locator('.kv-value').fill('v1');
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(1).locator('.kv-key').fill(key2);
    await page.locator('#modal .kv-row').nth(1).locator('.kv-value').fill('v2');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 使用前缀过滤只显示我们创建的两个变量
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{nav_`);
    await waitForAutocompletePopup(page);

    // 应该有选中项
    const items = page.locator('.var-autocomplete-item');
    await expect(items.first()).toHaveClass(/selected/);

    // 按下箭头
    await page.locator('#url-input').press('ArrowDown');
    await expect(items.nth(1)).toHaveClass(/selected/);

    // 按上箭头回来
    await page.locator('#url-input').press('ArrowUp');
    await expect(items.first()).toHaveClass(/selected/);

    // 弹窗应该仍然可见
    await waitForAutocompletePopup(page);
  });

  test('Enter 键确认选择插入变量', async ({ page }) => {

    const uniqueKey = `enter_select_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('val');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 使用前缀过滤
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{enter_select_`);
    await waitForAutocompletePopup(page);

    // 按 Enter 选择
    await page.locator('#url-input').press('Enter');

    // 验证输入框中插入了 {{uniqueKey}}
    await expect(page.locator('#url-input')).toHaveValue(`{{${uniqueKey}}}`);
    // 弹窗应该关闭
    await waitForAutocompleteClose(page);
  });

  test('Escape 键关闭自动补全弹窗', async ({ page }) => {

    const uniqueKey = `esc_close_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('val');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{esc_close_`);
    await waitForAutocompletePopup(page);

    await page.locator('#url-input').press('Escape');

    await waitForAutocompleteClose(page);
  });

  test('输入部分字符过滤变量列表', async ({ page }) => {

    const key1 = `filter_alpha_${Date.now()}`;
    const key2 = `filter_beta_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(0).locator('.kv-key').fill(key1);
    await page.locator('#modal .kv-row').nth(0).locator('.kv-value').fill('v1');
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').nth(1).locator('.kv-key').fill(key2);
    await page.locator('#modal .kv-row').nth(1).locator('.kv-value').fill('v2');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    // 只过滤 filter_beta
    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{filter_beta`, { delay: 50 });
    // 等待弹窗可见（过滤后应只显示 filter_beta）
    await waitForAutocompletePopup(page);
    // 应该只显示 filter_beta（不包含 filter_alpha）
    await expect(page.locator('#var-autocomplete-popup')).toContainText(key2);
    await expect(page.locator('#var-autocomplete-popup')).not.toContainText(key1);
  });

  test('在 Headers 输入框中使用自动补全', async ({ page }) => {

    const uniqueKey = `hdr_auto_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('hdr_val');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    await switchRequestTab(page, 'headers');
    const headersContainer = page.locator('#tab-headers');
    await expect(headersContainer).toBeVisible();
    await headersContainer.locator('.kv-add-btn').click();
    await expect(headersContainer.locator('.kv-row').last()).toBeVisible();

    const valueInput = headersContainer.locator('.kv-row').first().locator('.kv-value');
    await valueInput.click({ force: true });
    // 使用慢速逐字符输入以触发 input 事件，给 UI 时间处理滚动事件
    await valueInput.pressSequentially(`{{hdr_auto_`, { delay: 50 });
    await waitForAutocompletePopup(page);
    await expect(page.locator('#var-autocomplete-popup')).toContainText(uniqueKey);
  });

  test('在 Body textarea 中使用自动补全', async ({ page }) => {

    const uniqueKey = `body_auto_${Date.now()}`;
    await page.locator('#btn-manage-global-vars').click();
    await waitForModal(page);
    await page.locator('#modal .kv-add-btn').click();
    await page.locator('#modal .kv-row').first().locator('.kv-key').fill(uniqueKey);
    await page.locator('#modal .kv-row').first().locator('.kv-value').fill('body_val');
    await page.locator('#modal #save-global-vars').click();
    await waitForModalClose(page);

    await switchRequestTab(page, 'body');
    await expect(page.locator('#body-textarea')).toBeVisible();
    await page.locator('#body-textarea').click();
    await page.locator('#body-textarea').pressSequentially(`{{body_auto_`);
    await waitForAutocompletePopup(page);
    await expect(page.locator('#var-autocomplete-popup')).toContainText(uniqueKey);
  });

  test('输入不存在的变量前缀不显示匹配项', async ({ page }) => {

    await page.locator('#url-input').click();
    await page.locator('#url-input').pressSequentially(`{{nonexistent_xyz_unique_prefix_${Date.now()}`);
    await waitForAutocompleteClose(page);
  });
});
