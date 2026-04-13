import { type Page, expect } from '../fixtures';

/**
 * 点击发送按钮并等待响应状态码出现
 */
export async function sendRequestAndWait(
  page: Page,
  url: string,
  expectedStatus?: string | RegExp,
  options?: { timeout?: number },
) {
  await page.locator('#url-input').fill(url);
  await page.locator('#send-btn').click();
  const opts = options?.timeout ? { timeout: options.timeout } : undefined;
  if (expectedStatus !== undefined) {
    await expect(page.locator('#response-status')).toContainText(expectedStatus, opts);
  } else {
    await expect(page.locator('#response-status')).toBeVisible(opts);
  }
}

/**
 * 等待响应面板出现并加载完成
 */
export async function waitForResponse(page: Page, options?: { timeout?: number }) {
  const opts = options?.timeout ? { timeout: options.timeout } : undefined;
  await expect(page.locator('#response-status')).toBeVisible(opts);
}

/**
 * 等待模态框打开并可见
 */
export async function waitForModal(page: Page, options?: { timeout?: number }) {
  const opts = options?.timeout ? { timeout: options.timeout } : undefined;
  await expect(page.locator('#modal-overlay')).toBeVisible(opts);
}

/**
 * 等待模态框关闭
 */
export async function waitForModalClose(page: Page, options?: { timeout?: number }) {
  const opts = options?.timeout ? { timeout: options.timeout } : undefined;
  await expect(page.locator('#modal-overlay')).not.toBeVisible(opts);
}

/**
 * 等待侧边栏面板加载完成（通过请求面板可见性判断）
 */
export async function waitForPanelLoad(page: Page) {
  await expect(page.locator('#request-panel')).toBeVisible();
}

/**
 * 等待变量自动补全弹窗出现
 */
export async function waitForAutocompletePopup(page: Page) {
  await expect(page.locator('#var-autocomplete-popup')).not.toHaveClass(/hidden/);
}

/**
 * 等待变量自动补全弹窗关闭
 */
export async function waitForAutocompleteClose(page: Page) {
  await expect(page.locator('#var-autocomplete-popup')).toHaveClass(/hidden/);
}

/**
 * 在输入框中触发自动补全（输入前缀并等待弹窗出现）
 */
export async function triggerAutocomplete(
  page: Page,
  inputSelector: string,
  prefix: string,
) {
  await page.locator(inputSelector).click();
  await page.locator(inputSelector).pressSequentially(prefix);
  await waitForAutocompletePopup(page);
}

/**
 * 等待 toast 通知出现并包含指定文本
 */
export async function waitForToast(page: Page, text?: string) {
  const toast = page.locator('.toast');
  if (text !== undefined) {
    await expect(toast).toContainText(text, { timeout: 5000 });
  } else {
    await expect(toast).toBeVisible({ timeout: 5000 });
  }
}

/**
 * 切换请求面板标签页并等待内容加载
 */
export async function switchRequestTab(page: Page, tabName: string) {
  await page
    .locator(`#request-panel .tab[data-tab="${tabName}"]`)
    .click();
  await expect(
    page.locator(`#tab-${tabName}`),
  ).toBeVisible();
}

/**
 * 切换响应面板标签页
 */
export async function switchResponseTab(page: Page, tabName: string) {
  await page
    .locator(`#response-panel .tab[data-response-tab="${tabName}"]`)
    .click();
}

/**
 * 运行集合：悬停集合节点并点击运行按钮
 */
export async function runCollection(page: Page, colName: string) {
  const treeItem = page.locator('#collection-tree .tree-item').filter({ hasText: colName }).first();
  const runBtn = treeItem.locator('.tree-run-btn');
  await treeItem.hover();
  await expect(runBtn).toBeVisible();
  await runBtn.click();
}

/**
 * 等待响应搜索计数更新（搜索导航后等待计数刷新）
 */
export async function waitForSearchCount(page: Page, expectedCount?: string) {
  if (expectedCount !== undefined) {
    await page.waitForFunction(
      ([selector, expected]) => document.querySelector(selector)?.textContent === expected,
      ['#response-search-count', expectedCount],
    );
  } else {
    await page.waitForFunction(
      ([selector]) => {
        const text = document.querySelector(selector)?.textContent ?? '';
        return text !== '' && text.includes('/');
      },
      ['#response-search-count'],
    );
  }
}

/**
 * 生成唯一标识符，用于并行测试中避免命名冲突
 */
export function uniqueId(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
